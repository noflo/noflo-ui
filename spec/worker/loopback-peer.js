/**
 * @file loopback-peer.js: wires two in-process Reticulum instances together
 * over a TCP loopback (one listens, one dials) so tests can build mesh
 * providers on them without external network access. Same harness pattern as
 * y-reticulum's own test suite.
 */
import net from "node:net";
import { TCPClientInterface, TCPServerInterface } from "@reticulum/node";
import { Reticulum } from "../../vendor/reticulum-core.js";

export const HOST = "127.0.0.1";

/** Resolves with a free localhost TCP port (ephemeral, immediately released). */
export function getFreePort() {
  return new Promise((resolve, reject) => {
    const probe = net.createServer();
    probe.unref();
    probe.on("error", reject);
    probe.listen({ host: HOST, port: 0 }, () => {
      const { port } = /** @type {net.AddressInfo} */ (probe.address());
      probe.close(() => resolve(port));
    });
  });
}

/**
 * Wires two in-process Reticulum instances over a TCP loopback (A listens, B
 * dials) and returns them plus a `close()` that tears the link down.
 *
 * @returns {Promise<{
 *   rnsA: any,
 *   rnsB: any,
 *   close: () => Promise<void>,
 * }>}
 */
export async function makeLoopback() {
  const port = await getFreePort();
  const rnsA = new Reticulum();
  const rnsB = new Reticulum();
  // A listens. The TCPServerInterface has no writable stream itself, so do not
  // addInterface() it — only its spawned children get wired in, marked default
  // so the leaf can emit handshake packets via the default-interface fallback.
  const server = new TCPServerInterface({ port });
  await server.connect();
  const spawned = new Promise((resolve) => {
    server.addEventListener(
      "connection",
      (/** @type {any} */ event) => {
        rnsA.addInterface(event.detail, true);
        resolve();
      },
      { once: true },
    );
  });
  const client = new TCPClientInterface({ host: HOST, port });
  await client.connect();
  rnsB.addInterface(client, true);
  await spawned;
  return {
    rnsA,
    rnsB,
    async close() {
      client.disconnect?.();
      server.disconnect?.();
      const transportIfaces = [
        ...(rnsA.transport?.interfaces ?? []),
        ...(rnsB.transport?.interfaces ?? []),
      ];
      for (const iface of transportIfaces) {
        iface.disconnect?.();
      }
    },
  };
}
