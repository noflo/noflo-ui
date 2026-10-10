/**
 * @file Dacar link authorization for y-reticulum rooms (work document #25
 * §6.2): the application-defined authorization phase that runs on an
 * established link — after the identity is proven, before any sync traffic
 * flows. Both peers exchange their Dacar assertions over the link, and each
 * verifies the remote's against the local project Trust Anchor through the
 * Dacar Engine; a link whose peer cannot prove authorization is torn down
 * (unknown Trust Anchors and forged assertions among them, §7).
 *
 * Exchange payloads are JSON, chunked to stay under the RNS link channel
 * MDU with the same envelope shape the bootstrap channel uses.
 */

/**
 * Maximum JSON bytes per exchange message (see the bootstrap channel's MDU
 * budget: 431-byte link channel MDU minus framing).
 */
const EXCHANGE_CHUNK_BYTES = 320;

/**
 * Splits a JSON payload into chunk envelopes for the link exchange: a small
 * payload travels as-is; larger ones as `{ __chunk: [i, n], data }` parts.
 *
 * @param {any} payload
 * @returns {Uint8Array[]}
 */
export function encodeAuthPayload(payload) {
  const json = JSON.stringify(payload);
  if (json.length <= EXCHANGE_CHUNK_BYTES) {
    return [new TextEncoder().encode(json)];
  }
  const parts = Math.ceil(json.length / EXCHANGE_CHUNK_BYTES);
  const chunks = [];
  for (let i = 0; i < parts; i++) {
    chunks.push(
      new TextEncoder().encode(
        JSON.stringify({
          __chunk: [i, parts],
          data: json.slice(
            i * EXCHANGE_CHUNK_BYTES,
            (i + 1) * EXCHANGE_CHUNK_BYTES,
          ),
        }),
      ),
    );
  }
  return chunks;
}

/**
 * Reassembles chunked exchange payloads. Feed every received message to
 * {@link LinkPayloadReassembler.push}; it resolves the parsed payload once
 * all parts arrived.
 *
 * @typedef {Object} LinkPayloadReassembler
 * @property {(bytes: Uint8Array) => any | null} push Returns the parsed
 *   payload when complete, null while parts are missing, on duplicates, or
 *   on malformed input.
 */

/**
 * @returns {LinkPayloadReassembler}
 */
export function createPayloadReassembler() {
  /** @type {string[]} */
  let chunks = [];
  let received = 0;
  return {
    /**
     * @param {Uint8Array} bytes
     * @returns {any | null}
     */
    push(bytes) {
      let payload;
      try {
        payload = JSON.parse(new TextDecoder().decode(bytes));
      } catch {
        return null;
      }
      if (!Array.isArray(payload?.__chunk)) {
        return payload;
      }
      const [index, total] = payload.__chunk;
      if (
        typeof index !== "number" ||
        typeof total !== "number" ||
        total < 1 ||
        total > 4096 ||
        index < 0 ||
        index >= total ||
        typeof payload.data !== "string"
      ) {
        return null;
      }
      if (chunks.length === 0) {
        chunks = new Array(total).fill(undefined);
        received = 0;
      }
      if (chunks.length !== total || chunks[index] !== undefined) return null;
      chunks[index] = payload.data;
      received += 1;
      if (received < total) return null;
      const complete = chunks.join("");
      chunks = [];
      received = 0;
      try {
        return JSON.parse(complete);
      } catch {
        return null;
      }
    },
  };
}

/**
 * The Dacar link authorizer: a `LinkAuthorizer` for the y-reticulum room.
 *
 * The phase runs symmetrically — both sides send first, then read — so it
 * cannot deadlock:
 *
 * 1. **Locally verified knowledge allows the link**: a peer whose
 *    authorization the local Dacar node already holds (the anchor's own
 *    mint, a countersigned Glass grant) needs no on-link proof.
 * 2. **Requester mode dials**: a device whose grants map is empty (a fresh
 *    joiner) must be able to reach the owner so the access request can
 *    surface; the owner's side still refuses it (below).
 * 3. **Otherwise the peer presents its assertions**: every presented grant
 *    must name the *proven* remote identity as its subject (a third party's
 *    grant is worthless here), is ingested through verify-on-ingest against
 *    the designated Trust Anchor — unknown anchors and forged pubkeys are
 *    refused (§7) — and the Dacar Engine must allow the peer's `sync`
 *    relation over the project resource.
 *
 * @param {{
 *   isInRequesterMode: () => boolean,
 *   isGranted: (peerHash: string) => boolean,
 *   peerRole?: ((peerHash: string) => string | null) | null,
 *   localAnchorHash?: (() => string | null) | null,
 *   ownAuthorization: () => any | null,
 *   ensureDacarNode: () => Promise<any | null>,
 *   projectId: () => string,
 * }} hooks `ownAuthorization` returns the Dacar grant naming this device
 *   (the one whose subject is the local identity hash), or null when the
 *   device holds none. `peerRole` returns the granted peer's project role
 *   (an observer gets a read-only capability verdict, work document #54).
 *   `localAnchorHash` returns the project anchor hash once the bootstrap
 *   handoff delivered it; requester-mode initiator links must target it.
 * @returns {(context: any) => Promise<boolean | { sync: boolean, write: boolean }>}
 */
export function createDacarLinkAuthorizer({
  isInRequesterMode,
  isGranted,
  peerRole = null,
  ownAuthorization,
  ensureDacarNode,
  localAnchorHash = null,
  projectId,
}) {
  return async (/** @type {any} */ context) => {
    const remoteHash = context?.remoteIdentityHash;
    if (typeof remoteHash !== "string" || !remoteHash) return false;
    // A granted peer's capabilities ride the grant's role (work document
    // #54, unblocked by y-reticulum 0.5.0's capability verdicts): an
    // observer gets { sync: true, write: false } — the transport drops
    // the peer's inbound Doc updates while awareness and our updates
    // still flow — and every other role is full sync+write.
    if (isGranted(remoteHash)) {
      const role = peerRole?.(remoteHash) ?? null;
      if (role === "observer") return { sync: true, write: false };
      return true;
    }
    // Requester mode (work document #54): only links THIS device
    // initiated are the join dial — responder-side inbound links stay
    // refused (they surface as join requests). And when the bootstrap
    // handoff has already delivered the project's anchor, the peer we
    // initiated to must BE the anchor: an attacker announcing the same
    // project room must not inherit the join window's full access.
    if (isInRequesterMode()) {
      if (context.initiator !== true) return false;
      const anchorHash = localAnchorHash?.() ?? null;
      if (anchorHash && remoteHash !== anchorHash) return false;
      return true;
    }

    // Both sides send first, then read: no deadlock
    const own = ownAuthorization();
    for (const chunk of encodeAuthPayload({
      grants: own ? [own] : [],
    })) {
      await context.exchange.send(chunk);
    }
    const reassembler = createPayloadReassembler();
    /** @type {any} */
    let remote = null;
    for (;;) {
      const bytes = await context.exchange.receive();
      remote = reassembler.push(bytes);
      if (remote) break;
    }

    const node = await ensureDacarNode();
    if (!node) return false;
    for (const authorization of remote?.grants ?? []) {
      // A presented grant must name the proven remote identity: anything
      // else is a replayed third-party assertion
      if (authorization?.subject !== remoteHash) return false;
      await node.ingestAuthorization(authorization);
    }
    // The exchange path evaluates both relations: the verdict is the
    // capability object the transport enforces (work document #54)
    const sync =
      (await node.evaluate(projectId(), "sync", remoteHash)) === true;
    if (!sync) return { sync: false, write: false };
    const write =
      (await node.evaluate(projectId(), "write", remoteHash)) === true;
    return { sync: true, write };
  };
}
