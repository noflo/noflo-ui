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
 * Creates the mesh telemetry tap.
 *
 * @param {Object} options
 * @param {(echo: any) => void} options.postMessage The Engine → Glass
 *   echo channel.
 * @returns {{ attach: (reticulum: any) => void }}
 */
export function createMeshTelemetry({ postMessage }) {
  /** The transport whose stream is currently observed. */
  let attachedRns = /** @type {any} */ (null);
  /** @type {Map<any, Array<[string, (event: any) => void]>>} */
  const interfaceListeners = new Map();

  /**
   * Posts one legible telemetry echo.
   *
   * @param {{ category: "announce" | "interface", message: string, tone?: "ok" | "fail" | "" }} event
   */
  function post(event) {
    postMessage({
      kind: "mesh-telemetry",
      category: event.category,
      message: event.message,
      time: Date.now(),
      ...(event.tone === undefined ? {} : { tone: event.tone }),
    });
  }

  /**
   * The transport's announce listener: every peer's announce is mesh
   * presence. App-specific payloads stay opaque here — the FBP-typed
   * subset is the runtime bridge's discovery, not this tap's concern.
   *
   * @param {any} event
   */
  function onAnnounce(event) {
    const detail = event.detail ?? {};
    const ratchet = detail.ratchet ? " · ratcheted" : "";
    post({
      category: "announce",
      message: `announce heard · ${hashSuffix(detail.destinationHash)}${ratchet}`,
    });
  }

  /**
   * Wires one interface's lifecycle events.
   *
   * @param {any} iface
   */
  function attachInterface(iface) {
    if (interfaceListeners.has(iface)) return;
    const name = String(iface?.name ?? "interface");
    /** @type {Array<[string, (event: any) => void]>} */
    const listeners = [];
    const on = (/** @type {string} */ type, /** @type {() => void} */ fn) => {
      const listener = (/** @type {any} */ _event) => fn();
      iface.addEventListener(type, listener);
      listeners.push([type, listener]);
    };
    on("connected", () =>
      post({ category: "interface", message: `${name} connected`, tone: "ok" }),
    );
    on("disconnected", () =>
      post({ category: "interface", message: `${name} disconnected` }),
    );
    on("reconnecting", () =>
      post({
        category: "interface",
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

  return { attach };
}
