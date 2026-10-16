/**
 * @file Reticulum telemetry (work document #63 M2): the mesh layer's
 * observability tap — announces and interface lifecycle over state the
 * Engine already holds for discovery, echoed as the `mesh-telemetry`
 * family for the wires layer's mesh stream.
 *
 * The vocabulary is what the shared transport emits centrally: the
 * announce stream (every peer's presence, app-specific payloads included)
 * and the interface lifecycle of the interfaces the mesh layer attached.
 * Link-level telemetry (established/closed per connection) lives inside
 * the subsystems that own their links — y-reticulum, the runtime bridge —
 * and reaches the wires layer through their own streams, not this tap.
 *
 * The tap is observation only: it mutates nothing and holds no state
 * beyond its listeners. It re-attaches idempotently per Reticulum
 * instance, the same contract the runtime bridge keeps for mesh restarts.
 */

import { decodeAnnounceAppData } from "../../vendor/fbp-protocol.js";
import { toHex } from "../../vendor/reticulum-core.js";

/**
 * The last four bytes of a hash, for the compact display form.
 *
 * @param {Uint8Array | string | null | undefined} hash
 * @returns {string}
 */
function hashSuffix(hash) {
  if (!hash) return "unknown";
  const bytes =
    typeof hash === "string"
      ? // Hex form: the suffix is the last four bytes' hex
        hash.slice(-8)
      : toHex(hash.slice(-4));
  return `…${bytes}`;
}

/**
 * Summarizes an announce's app_data for the main column: FBP-typed
 * announces decode to the runtime's declared facts; other payloads show
 * as printable text when they read as text, as a byte count when they do
 * not.
 *
 * @param {Uint8Array | null | undefined} appData
 * @returns {{ summary: string, fbp: { nodeName: string, protocolVersion: number } | null }}
 */
function summarizeAppData(appData) {
  if (!appData || appData.length === 0) {
    return { summary: "", fbp: null };
  }
  try {
    const decoded = decodeAnnounceAppData(appData);
    return {
      summary: "",
      fbp: {
        nodeName: decoded.nodeName,
        protocolVersion: decoded.protocolVersion,
      },
    };
  } catch {
    // Not an FBP announce; the payload is still worth showing
  }
  try {
    const text = new TextDecoder("utf-8", { fatal: true }).decode(appData);
    const printable = /^[-\w .,:;'"()/@+=]*$/.test(text);
    if (printable && text.length > 0) {
      const snippet = text.length > 32 ? `${text.slice(0, 32)}…` : text;
      return { summary: ` · app-data "${snippet}"`, fbp: null };
    }
  } catch {
    // Binary payload
  }
  return { summary: ` · app-data ${appData.length} B`, fbp: null };
}

/**
 * Creates the mesh telemetry tap.
 *
 * @param {Object} options
 * @param {(echo: any) => void} options.postMessage The Engine → Glass
 *   echo channel.
 * @param {(identityHash: string) => boolean} [options.isPeer] Whether an
 *   announcing peer matters to this device — the mesh layer's own grant
 *   decision. FBP runtime announces always pass (the runtime discovery
 *   domain); every other announce shows only for granted peers, so the
 *   wider mesh's LXMF-class destinations do not flood the stream.
 * @returns {{ attach: (reticulum: any) => void, peerEvent: (established: boolean, label: string) => void, linkPolicy: (remoteIdentityHash: string | undefined, initiator: boolean, allowed: boolean) => void }}
 */
export function createMeshTelemetry({ postMessage, isPeer = () => false }) {
  /** The transport whose stream is currently observed. */
  let attachedRns = /** @type {any} */ (null);
  /** @type {Map<any, Array<[string, (event: any) => void]>>} */
  const interfaceListeners = new Map();

  /**
   * Posts one legible telemetry echo.
   *
   * @param {{ category: "announce" | "interface" | "peer", message: string, status: string, tone?: "ok" | "fail" | "", detail?: Record<string, any> }} event
   */
  function post(event) {
    postMessage({
      kind: "mesh-telemetry",
      category: event.category,
      message: event.message,
      status: event.status,
      time: Date.now(),
      ...(event.tone === undefined ? {} : { tone: event.tone }),
      ...(event.detail === undefined ? {} : { detail: event.detail }),
    });
  }

  /**
   * The transport's announce listener: every peer's announce is mesh
   * presence, and the facts the packet carries are the line — the
   * FBP-typed subset decodes to the runtime's declared name and protocol
   * version (the aspect is the protocol's default), other app_data
   * summarizes to printable text or a byte count, and the peer's identity
   * hash rides along so an announce correlates with the sync panel's
   * peers.
   *
   * @param {any} event
   */
  function onAnnounce(event) {
    const detail = event.detail ?? {};
    const destinationHex =
      detail.destinationHash instanceof Uint8Array
        ? toHex(detail.destinationHash)
        : (detail.destinationHash ?? "");
    const identityHex = detail.identity?.identityHash
      ? toHex(detail.identity.identityHash)
      : null;
    const { summary, fbp } = summarizeAppData(detail.appData);
    if (fbp) {
      post({
        category: "announce",
        status: "FBP",
        message: `runtime "${fbp.nodeName}" · v${fbp.protocolVersion} · ${hashSuffix(detail.destinationHash)}`,
        detail: {
          destinationHash: destinationHex,
          ...(identityHex ? { identityHash: identityHex } : {}),
          nodeName: fbp.nodeName,
          protocolVersion: fbp.protocolVersion,
          aspect: "fbp.runtime",
        },
      });
      return;
    }
    // The filter (work document #63 M2 review): the wider mesh's
    // announces — LXMF-class destinations by the thousand — are not this
    // device's business. Non-FBP announces show only for granted peers
    const granted = identityHex !== null && isPeer(identityHex);
    if (!granted) return;
    const ratchet = detail.ratchet ? " · ratcheted" : "";
    post({
      category: "announce",
      status: "ANNOUNCE",
      message: `announce · ${hashSuffix(detail.destinationHash)}${summary}${ratchet}`,
      detail: {
        destinationHash: destinationHex,
        ...(identityHex ? { identityHash: identityHex } : {}),
      },
    });
  }

  /**
   * Posts one peer-link event (work document #63 M2 review): the sync
   * provider's peers event is the authoritative link established/closed
   * signal for the project's connections — the thing the mesh log must
   * show.
   *
   * @param {boolean} established
   * @param {string} label The peer's identity suffix when resolved, the
   *   link id's otherwise.
   */
  function peerEvent(established, label) {
    post({
      category: "peer",
      status: established ? "JOIN" : "LEFT",
      message: established
        ? `peer connected · ${label}`
        : `peer left · ${label}`,
      tone: established ? "ok" : "",
    });
  }

  /**
   * The link policy's verdict (work document #63 M2 review): why sync
   * does not happen with a peer is answered exactly here — the decision
   * the console logs, on the wires stream where the sync narrative lives.
   *
   * @param {string | undefined} remoteIdentityHash The peer's verified
   *   identity hash, when identified.
   * @param {boolean} initiator Whether this side initiated the link.
   * @param {boolean} allowed The policy's verdict.
   */
  function linkPolicy(remoteIdentityHash, initiator, allowed) {
    const peer = remoteIdentityHash
      ? `…${remoteIdentityHash.slice(-12)}`
      : "unidentified";
    post({
      category: "peer",
      status: allowed ? "ALLOW" : "REFUSE",
      message: `link policy · ${peer} · ${initiator ? "initiator" : "responder"} · ${allowed ? "granted" : "refused — no grant"}`,
      tone: allowed ? "ok" : "fail",
    });
  }

  /**
   * Wires one interface's lifecycle events, and reports its live state at
   * wiring time: the tap attaches after the interfaces connected (the
   * browser wiring awaits connect before addInterface), so the first
   * `connected` event fired before anyone listened — without the
   * synthesis the stream could not tell whether the connection is live.
   *
   * @param {any} iface
   */
  function attachInterface(iface) {
    if (interfaceListeners.has(iface)) return;
    const name = String(iface?.name ?? "interface");
    if (iface.isOpen === true) {
      post({
        category: "interface",
        status: "UP",
        message: `${name} connected`,
        tone: "ok",
      });
    }
    /** @type {Array<[string, (event: any) => void]>} */
    const listeners = [];
    const on = (/** @type {string} */ type, /** @type {() => void} */ fn) => {
      const listener = (/** @type {any} */ _event) => fn();
      iface.addEventListener(type, listener);
      listeners.push([type, listener]);
    };
    on("connected", () =>
      post({
        category: "interface",
        status: "UP",
        message: `${name} connected`,
        tone: "ok",
      }),
    );
    on("disconnected", () =>
      post({
        category: "interface",
        status: "DOWN",
        message: `${name} disconnected`,
      }),
    );
    on("reconnecting", () =>
      post({
        category: "interface",
        status: "RETRY",
        message: `${name} reconnecting`,
        tone: "fail",
      }),
    );
    interfaceListeners.set(iface, listeners);
  }

  /**
   * Observes the shared instance's announce stream and interface
   * lifecycle. Idempotent per instance: a mesh restart swaps the RNS
   * instance and the next attach re-wires the new one.
   *
   * @param {any} reticulum
   */
  function attach(reticulum) {
    if (!reticulum?.transport || reticulum === attachedRns) return;
    if (attachedRns) {
      attachedRns.transport.removeEventListener("announce", onAnnounce);
      for (const [iface, listeners] of interfaceListeners) {
        for (const [type, listener] of listeners) {
          iface.removeEventListener(type, listener);
        }
      }
      interfaceListeners.clear();
    }
    attachedRns = reticulum;
    reticulum.transport.addEventListener("announce", onAnnounce);
    for (const iface of reticulum.transport.interfaces ?? []) {
      attachInterface(iface);
    }
  }

  return { attach, peerEvent, linkPolicy };
}
