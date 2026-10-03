/**
 * @file Bootstrap pre-flow (work document #25, "Knock and Approve"):
 * isolates Authorization & Peer Discovery from State Replication. An
 * ephemeral, reliable Reticulum Link between a Joiner and a Host exchanges
 * cryptographic identity (`link.identify()`), evaluates the Host decision
 * engine, and hands off a scoped access grant. After the handoff both sides
 * tear the link down and enter the sync phase (y-reticulum room).
 *
 * Both sides share the sync phase's Reticulum instance, so the joiner's
 * routing table warms up with the host's announces and path responses during
 * the whole wait — the first sync dial after the grant needs no discovery
 * wait (work document #21, update #13).
 *
 * The transport is injectable only in the sense that the caller supplies the
 * `Reticulum` instance; everything here speaks the real wire protocol, so the
 * loopback test harness exercises the same code paths as the browser worker.
 */

import {
  Destination,
  DestType,
  fromHex,
  LinkStatus,
  MessageBase,
  toHex,
} from "../../vendor/reticulum-core.js";

/**
 * Stable per-owner bootstrap destination app-name: the host announces an IN
 * destination under this name, and the invite URI carries its destination
 * hash so the joiner can reach the host without any announce exchange.
 */
export const BOOTSTRAP_APP_NAME = "noflo.join";

/** Prefix of the invite URI scheme (work document #25 §3.2 Step 1). */
export const INVITE_URI_PREFIX = "noflo://join/";

/** Bootstrap channel message type (< 0xf000); distinct per channel. */
const MSGTYPE = 0x10;

/** How long a generated invite token stays valid, in milliseconds. */
export const INVITE_TOKEN_TTL_MS = 24 * 60 * 60 * 1000;

/** Default deadline for the whole joiner state machine run. */
export const JOIN_TIMEOUT_MS = 60_000;

/** How long the host waits for the joiner's identify handshake. */
const IDENTIFY_TIMEOUT_MS = 10_000;

/** Interval between identity-recall polls while awaiting a path response. */
const RECALL_POLL_MS = 250;

/**
 * Wire message for the bootstrap link channel: both the knock packet
 * (§4.1) and the handoff response (§4.2, §4.3) travel as JSON bodies inside
 * this envelope.
 *
 * @extends {MessageBase}
 */
export class BootstrapMessage extends MessageBase {
  static MSGTYPE = MSGTYPE;
  constructor() {
    super();
    /** @type {Uint8Array} */
    this.data = /* @__PURE__ */ new Uint8Array(0);
  }
  /** @returns {Uint8Array} */
  pack() {
    return this.data;
  }
  /** @param {Uint8Array} raw */
  unpack(raw) {
    this.data = raw;
  }
}

/**
 * Joiner state machine states (work document #25 §5.1). `INIT_LOCAL_DB` and
 * `LAUNCH_YJS_SYNC` are driven by the Engine after this module returns; the
 * states here cover the link-bound portion plus the halt.
 */
export const STATE = {
  IDLE: "idle",
  REQUESTING_PATH: "requesting_path",
  LINKING: "linking",
  KNOCKING: "knocking",
  WAIT_RESPONSE: "wait_response",
  APPROVED: "approved",
  DECLINED: "declined",
};

/**
 * Decline reason codes (work document #25 §4.3).
 */
export const DECLINE_REASON = {
  HOST_LACKS_AUTHORITY: "host_lacks_authority",
  HOST_REJECTED: "host_rejected",
  INVALID_TOKEN: "invalid_token",
};

/**
 * Generates a random invite token (128-bit, hex).
 *
 * @returns {string}
 */
export function generateInviteToken() {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return toHex(bytes);
}

/**
 * Builds an invite URI (work document #25 §3.2 Step 1):
 * `noflo://join/<host_destination_hash>/<invite_token>`.
 *
 * @param {{ hostDestinationHash: string, token: string }} invite
 * @returns {string}
 */
export function buildInviteUri({ hostDestinationHash, token }) {
  return `${INVITE_URI_PREFIX}${hostDestinationHash.toLowerCase()}/${token.toLowerCase()}`;
}

/**
 * Parses an invite URI.
 *
 * @param {string} uri
 * @returns {{ hostDestinationHash: string, token: string } | null} Null when
 *   the URI is not a well-formed bootstrap invite.
 */
export function parseInviteUri(uri) {
  if (typeof uri !== "string") return null;
  if (!uri.startsWith(INVITE_URI_PREFIX)) return null;
  const rest = uri.slice(INVITE_URI_PREFIX.length);
  const separator = rest.indexOf("/");
  if (separator <= 0) return null;
  const hostDestinationHash = rest.slice(0, separator);
  const token = rest.slice(separator + 1);
  if (!/^[0-9a-f]{32}$/.test(hostDestinationHash)) return null;
  if (!/^[0-9a-f]{32}$/.test(token)) return null;
  return { hostDestinationHash, token };
}

/**
 * Validates an invite token against the host's issued-invite record.
 *
 * @param {{ token: string, createdAt: number, expiresAt: number } | null} record
 * @param {string} token
 * @param {number} now
 * @returns {boolean}
 */
export function isInviteRecordValid(record, token, now) {
  if (!record || typeof record.token !== "string") return false;
  if (record.token.toLowerCase() !== token.toLowerCase()) return false;
  return now < record.expiresAt;
}

/**
 * Whether the link still carries traffic (the ACTIVE status is the only one
 * that does; PENDING/HANDSHAKE/CLOSED do not).
 *
 * @param {any} link
 * @returns {boolean}
 */
function linkIsActive(link) {
  return link?.status === LinkStatus.ACTIVE;
}

/**
 * Sends a message on the link channel with the same backpressure loop the
 * y-reticulum PeerConn uses: wait while the send window is full and retry on
 * a transient link-not-ready error.
 *
 * @param {any} channel
 * @param {MessageBase} message
 * @param {() => boolean} isClosed
 */
async function sendChannelMessage(channel, message, isClosed) {
  for (;;) {
    if (isClosed()) return;
    while (!channel.isReadyToSend()) {
      if (isClosed()) return;
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
    try {
      await channel.send(message);
      return;
    } catch (err) {
      // Transient: the link finished activating between the readiness
      // check and the send; retry
      if (/** @type {any} */ (err)?.type === 1) continue;
      throw err;
    }
  }
}

/**
 * Collects channel payloads matching the bootstrap message type until the
 * predicate accepts a parsed body or the deadline passes.
 *
 * @param {any} link
 * @param {(body: any) => boolean} accept
 * @param {number} deadline
 * @returns {Promise<any | null>} Parsed JSON body, or null on timeout/close.
 */
function awaitChannelBody(link, accept, deadline) {
  const channel = link.getChannel();
  channel.registerMessageType(BootstrapMessage);
  return new Promise((resolve) => {
    let closed = false;
    const onClose = () => {
      if (closed) return;
      closed = true;
      clearTimeout(timer);
      channel.removeMessageHandler(handler);
      resolve(null);
    };
    const handler = (/** @type {any} */ msg) => {
      if (!(msg instanceof BootstrapMessage) || closed) return false;
      let body;
      try {
        body = JSON.parse(new TextDecoder().decode(msg.data));
      } catch {
        return false;
      }
      if (!accept(body)) return false;
      closed = true;
      clearTimeout(timer);
      channel.removeMessageHandler(handler);
      resolve(body);
      return true;
    };
    const timer = setTimeout(onClose, Math.max(0, deadline - Date.now()));
    channel.addMessageHandler(handler);
    link.addEventListener("close", onClose, { once: true });
  });
}

/**
 * Encodes a JSON body into a BootstrapMessage.
 *
 * @param {any} body
 * @returns {BootstrapMessage}
 */
function encodeBody(body) {
  const message = new BootstrapMessage();
  message.data = new TextEncoder().encode(JSON.stringify(body));
  return message;
}

/**
 * The Host side of the bootstrap protocol: announces the stable per-owner
 * `noflo.join` IN destination and answers knocks from joining peers.
 *
 * The decision engine (work document #25 §3.1) runs on every knock:
 *  1. already authorized by an existing grant → APPROVED (idempotent
 *     re-dials get the same answer without re-prompting);
 *  2. the invite token must be one the host issued and unexpired;
 *  3. authority: the host must be the project owner (a device that itself
 *     joined by invite has no authority to mint grants);
 *  4. otherwise the decision is surfaced to the host user via
 *     `requestApproval` and APPROVE / DECLINE resolves the knock.
 *
 * Every decision is remembered per joiner identity, so dropped links never
 * lose the decision and re-dials are answered immediately.
 *
 * @param {{
 *   reticulum: any,
 *   identity: any,
 *   projectId: string,
 *   projectName: string,
 *   isGranted: (identityHash: string) => boolean,
 *   getGrant: (identityHash: string) => Promise<any | null> | any | null,
 *   mintGrant: (identityHash: string) => Promise<any> | any,
 *   hasAuthority: () => boolean,
 *   requestApproval: (identityHash: string) => Promise<"approved" | "declined">,
 *   isValidInviteToken: (token: string) => Promise<boolean> | boolean,
 *   announceIntervalMs?: number,
 * }} options
 * @returns {Promise<{ destinationHash: string, stop: () => Promise<void> }>}
 */
export async function createBootstrapHost({
  reticulum,
  identity,
  projectId,
  projectName,
  isGranted,
  getGrant,
  mintGrant,
  hasAuthority,
  requestApproval,
  isValidInviteToken,
  announceIntervalMs = 60_000,
}) {
  const dest = await Destination.IN(
    BOOTSTRAP_APP_NAME,
    DestType.SINGLE,
    identity,
    reticulum,
  );
  await reticulum.transport.bindLocalDestination(dest);
  /** @type {Map<string, any>} */
  const decisions = new Map();
  let stopped = false;

  /**
   * Waits for the joiner's signed identify handshake on this link.
   *
   * @param {any} link
   * @returns {Promise<any | null>} Remote identity, or null on timeout.
   */
  const awaitIdentify = (link) =>
    new Promise((resolve) => {
      const timer = setTimeout(() => {
        link.removeEventListener("identify", onIdentify);
        resolve(null);
      }, IDENTIFY_TIMEOUT_MS);
      const onIdentify = (/** @type {any} */ event) => {
        clearTimeout(timer);
        resolve(event.detail?.identity ?? null);
      };
      link.addEventListener("identify", onIdentify, { once: true });
    });

  const evaluate = async (
    /** @type {any} */ body,
    /** @type {any} */ joinerHash,
  ) => {
    // 1. Already authorized: idempotent re-dial path, no prompt; the
    //    existing grant re-handoffs so a dropped link never lost it
    if (isGranted(joinerHash)) {
      const grant =
        (await getGrant(joinerHash)) ?? (await mintGrant(joinerHash));
      return {
        status: "approved",
        project: { id: projectId, name: projectName },
        grant,
      };
    }
    // 2. Token must be one we issued and unexpired
    if (!isValidInviteToken(body?.token ?? "")) {
      return { status: "declined", reason: DECLINE_REASON.INVALID_TOKEN };
    }
    // 3. Authority: only a device that owns its grants may mint new ones.
    //    An invited device holds no signing authority for the project.
    //    (Dacar trust anchors replace this check in the next milestone.)
    if (!hasAuthority()) {
      return {
        status: "declined",
        reason: DECLINE_REASON.HOST_LACKS_AUTHORITY,
      };
    }
    // 4. Surface the decision to the host user
    const decision = await requestApproval(joinerHash);
    if (decision !== "approved") {
      return { status: "declined", reason: DECLINE_REASON.HOST_REJECTED };
    }
    const grant = await mintGrant(joinerHash);
    return {
      status: "approved",
      project: { id: projectId, name: projectName },
      grant,
    };
  };

  const onLinkRequest = async (/** @type {any} */ event) => {
    if (stopped) return;
    /** @type {any} */ let link = null;
    try {
      link = await dest.acceptLink(event.detail.packet);
      if (stopped) {
        await link.teardown();
        return;
      }
      const joinerIdentity = await awaitIdentify(link);
      if (!joinerIdentity || stopped) {
        await link.teardown();
        return;
      }
      const joinerHash = toHex(joinerIdentity.getSalt());
      const channel = link.getChannel();
      channel.registerMessageType(BootstrapMessage);
      // Await the knock packet
      const body = await awaitChannelBody(
        link,
        (candidate) => candidate?.type === "knock",
        Date.now() + IDENTIFY_TIMEOUT_MS,
      );
      if (!body || stopped) {
        await link.teardown();
        return;
      }
      // Idempotent: remembered decisions answer without re-evaluation
      let response = decisions.get(joinerHash);
      if (!response) {
        response = await evaluate(body, joinerHash);
        decisions.set(joinerHash, response);
      }
      await sendChannelMessage(
        channel,
        encodeBody(response),
        () => stopped || !linkIsActive(link),
      );
      await link.teardown();
    } catch {
      // A failed bootstrap link is best-effort: the joiner re-dials
      if (link) link.teardown().catch(() => {});
    }
  };

  dest.addEventListener("link_request", onLinkRequest, { once: false });
  dest.startAnnouncing({ intervalMs: announceIntervalMs });

  return {
    /** Hex destination hash that goes into invite URIs. */
    get destinationHash() {
      return toHex(/** @type {any} */ (dest.destinationHash));
    },
    async stop() {
      stopped = true;
      dest.stopAnnouncing();
      dest.removeEventListener("link_request", onLinkRequest);
      reticulum.transport.unbindLocalDestination(dest);
    },
  };
}

/**
 * Runs the Joiner state machine (work document #25 §5.1): resolve the host's
 * path, establish the bootstrap link, identify, knock, and await the handoff
 * response. The link is always torn down before returning.
 *
 * @param {{
 *   reticulum: any,
 *   identity: any,
 *   invite: { hostDestinationHash: string, token: string },
 *   onState?: (state: string) => void,
 *   timeoutMs?: number,
 * }} options
 * @returns {Promise<any>} The handoff response body (approved or declined).
 * @throws {Error} On path/link/protocol failures; the message names the
 *   state machine stage that failed.
 */
export async function joinViaBootstrapInvite({
  reticulum,
  identity,
  invite,
  onState = () => {},
  timeoutMs = JOIN_TIMEOUT_MS,
}) {
  const deadline = Date.now() + timeoutMs;
  const fail = (/** @type {string} */ stage, /** @type {any} */ err) => {
    const reason = err?.message ?? String(err);
    throw new Error(`Bootstrap join failed at ${stage}: ${reason}`);
  };

  // [ REQUESTING_PATH ]: the invite carries the host's destination hash, so
  // an active path request bypasses the periodic announce cadence
  onState(STATE.REQUESTING_PATH);
  const hostHashBytes = fromHex(invite.hostDestinationHash);
  try {
    await reticulum.transport.requestPath(hostHashBytes);
  } catch (err) {
    fail(STATE.REQUESTING_PATH, err);
  }
  // The path response arrives as an announce that populates the transport's
  // known-destination store; poll the recall until the host identity is
  // available or the deadline passes
  let hostIdentity = null;
  while (Date.now() < deadline) {
    hostIdentity = await reticulum.transport.recallIdentity(hostHashBytes);
    if (hostIdentity) break;
    await new Promise((resolve) => setTimeout(resolve, RECALL_POLL_MS));
  }
  if (!hostIdentity) fail(STATE.REQUESTING_PATH, "host path not resolved");

  // [ LINKING ]: ephemeral, reliable link to the host's bootstrap destination
  onState(STATE.LINKING);
  const destination = await Destination.OUT(
    BOOTSTRAP_APP_NAME,
    DestType.SINGLE,
    hostIdentity,
    reticulum,
  );
  /** @type {any} */ let link = null;
  try {
    link = await destination.createLink();
    await link.identify(identity);
  } catch (err) {
    if (link) link.teardown().catch(() => {});
    fail(STATE.LINKING, err);
  }

  try {
    // [ KNOCKING ]: send the invite token packet (§4.1)
    onState(STATE.KNOCKING);
    const channel = link.getChannel();
    channel.registerMessageType(BootstrapMessage);
    await sendChannelMessage(
      channel,
      encodeBody({ type: "knock", token: invite.token }),
      () => !linkIsActive(link),
    );

    // [ WAIT_RESPONSE ]: the host answers with approved or declined (§4.2/§4.3)
    onState(STATE.WAIT_RESPONSE);
    const response = await awaitChannelBody(
      link,
      (candidate) =>
        candidate?.type === "approved" ||
        candidate?.type === "declined" ||
        candidate?.status === "approved" ||
        candidate?.status === "declined",
      deadline,
    );
    if (!response) fail(STATE.WAIT_RESPONSE, "no handoff response received");
    onState(response.status === "approved" ? STATE.APPROVED : STATE.DECLINED);
    return response;
  } finally {
    // [ Teardown Link ] before entering the sync phase
    link.teardown().catch(() => {});
  }
}
