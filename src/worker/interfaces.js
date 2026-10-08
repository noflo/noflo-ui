/**
 * @file Browser interface wiring (the `#interfaces` platform module, work
 * document #44): attaches the enabled mesh interfaces to the Reticulum
 * instance. The browser speaks WebSocket only — the Node-only types
 * (shared rnsd instance, AutoInterface, TCP) live in the Node wiring and
 * never touch the browser bundle.
 */

import { WebSocketClientInterface } from "../../vendor/reticulum-core.js";

/**
 * Attaches the enabled interfaces to the Reticulum instance.
 *
 * @param {any} rns The shared Reticulum instance.
 * @param {Array<{ type: string, options?: any, enabled?: boolean }>} interfaces
 *   The mesh config's interface entries.
 * @returns {Promise<void>}
 */
export async function attachInterfaces(rns, interfaces) {
  for (const iface of interfaces ?? []) {
    if (!iface.enabled) continue;
    if (iface.type === "websocket") {
      const client = new WebSocketClientInterface(iface.options ?? {});
      await client.connect();
      rns.addInterface(client, true);
      continue;
    }
    console.warn(
      `Mesh interface type ${iface.type} is not available in the browser; skipped`,
    );
  }
}
