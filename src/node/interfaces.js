/**
 * @file Node interface wiring (the `#interfaces` platform module, work
 * document #44): the server-side counterpart of the browser wiring. The
 * bridge speaks the full Reticulum interface set — the shared rnsd
 * instance (domain socket), zero-config LAN discovery (AutoInterface),
 * TCP, and WebSocket.
 *
 * @reticulum/node is statically imported here: this file resolves only on
 * Node (the package's imports field), so the browser bundle stays clean.
 *
 * The out-of-the-box defaults mirror the pi-rngit-work-document-skill's
 * transport: a shared Reticulum instance when an rnsd is running, else
 * AutoInterface for LAN discovery. An empty interface list in the config
 * selects those defaults; explicit entries replace them.
 */

import {
  AutoInterface,
  LocalClientInterface,
  TCPClientInterface,
  TCPServerInterface,
} from "@reticulum/node";
import { WebSocketServerInterface } from "@reticulum/websocket-server-node";
import { WebSocketClientInterface } from "../../vendor/reticulum-core.js";

/**
 * Attaches the enabled interfaces to the Reticulum instance. An empty
 * (or absent) list selects the defaults: the shared instance when an rnsd
 * is running, else AutoInterface for LAN discovery.
 *
 * @param {any} rns The shared Reticulum instance.
 * @param {Array<{ type: string, options?: any, enabled?: boolean }> | undefined} interfaces
 *   The mesh config's interface entries.
 * @returns {Promise<void>}
 */
export async function attachInterfaces(rns, interfaces = []) {
  const list = (interfaces ?? []).filter((iface) => iface.enabled);
  if (list.length === 0) {
    list.push(
      { type: "shared", options: {}, enabled: true },
      { type: "autointerface", options: { name: "auto" }, enabled: true },
    );
  }

  for (const iface of list) {
    const options = iface.options ?? {};
    if (iface.type === "websocket") {
      const client = new WebSocketClientInterface(options);
      await client.connect();
      rns.addInterface(client, true);
    } else if (iface.type === "shared") {
      // The shared rnsd instance: a domain-socket client to the local
      // Reticulum daemon, discovered from its config. `null` means the
      // daemon runs without share_instance enabled — skip quietly
      const shared =
        await LocalClientInterface.connectToSharedInstance(options);
      if (shared) {
        rns.addInterface(shared, true);
      } else {
        console.warn(
          "Mesh interface type shared: no shared instance running; skipped",
        );
      }
    } else if (iface.type === "autointerface") {
      const auto = new AutoInterface(options);
      await auto.connect();
      rns.addInterface(auto, true);
    } else if (iface.type === "tcp") {
      const tcp = options.listen
        ? new TCPServerInterface(/** @type {any} */ (options))
        : new TCPClientInterface(options);
      await tcp.connect();
      if (options.listen) {
        // The server interface wires its spawned child connections into
        // the instance as they arrive
        tcp.addEventListener("connection", (/** @type {any} */ event) => {
          rns.addInterface(event.detail, true);
        });
      } else {
        rns.addInterface(tcp, true);
      }
    } else if (iface.type === "websocketserver") {
      // Hub mode (work document #44 M3): inbound WebSocket connections
      // spawn client interfaces, announced via the connection event —
      // the zero-config mesh on-ramp for browsers. Server-only type:
      // it never appears in the browser's mesh settings (the stored
      // config's normalizer drops it); the Companion appends it to the
      // interface list it hands the engine
      const server = new WebSocketServerInterface(/** @type {any} */ (options));
      await server.connect();
      server.addEventListener("connection", (/** @type {any} */ event) => {
        rns.addInterface(event.detail, true);
      });
    } else {
      console.warn(
        `Mesh interface type ${iface.type} is not available on Node; skipped`,
      );
    }
  }
}
