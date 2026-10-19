/**
 * @file The loopback server helper (work document #47 item 3's test): a
 * plain Node process holding the Reticulum TCP server interface the
 * runtime and the test's RNS dial through. Run as its own process — the
 * link handshake with the runtime is processed HERE, never inside the
 * test runner's child, whose event loop the handshake processing wedges
 * (the runner-child's stream-read spinning was the field bug this helper
 * avoids). Lives 90 seconds; the test kills it explicitly.
 */

import { TCPServerInterface } from "@reticulum/node";
import { Reticulum } from "../../vendor/reticulum-core.js";

const port = Number(process.argv[2] ?? 45678);
const rns = new Reticulum();
const server = new TCPServerInterface({ port });
await server.connect();
server.addEventListener("connection", (/** @type {any} */ event) => {
  rns.addInterface(event.detail, true);
});
console.log(`server ready on ${port}`);
setTimeout(() => process.exit(0), 90_000);
