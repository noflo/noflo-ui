import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { TCPClientInterface, TCPServerInterface } from "@reticulum/node";
import {
  Destination,
  DestType,
  fromHex,
  Identity,
  Reticulum,
} from "../../vendor/reticulum-core.js";
import {
  roomDestinationHash,
  roomDestinationName,
} from "../../vendor/y-reticulum.js";
import { getFreePort, HOST } from "./loopback-peer.js";

const wait = (/** @type {number} */ ms) =>
  new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Multi-interface reproduction (the browser topology, work document #44
 * M3 live finding): two peers reach each other over TWO parallel paths —
 * a shared hub plus a direct link — mirroring hub + cloud WebSocket
 * interfaces. If reticulum-js is broken on multi-interface setups,
 * announce ingestion or path resolution hangs here.
 */
describe("reticulum-js on multiple interfaces (sync regression)", () => {
  it("two peers with two parallel paths resolve a path and open a link", async () => {
    const hubPort = await getFreePort();
    const directPort = await getFreePort();

    // The hub: accepts connections from both peers (its own transport;
    // like the Companion, it ingests but does not relay)
    const hub = new Reticulum();
    const hubServer = new TCPServerInterface({ port: hubPort });
    await hubServer.connect();
    hubServer.addEventListener("connection", (/** @type {any} */ e) => {
      hub.addInterface(e.detail, true);
    });

    // Peer A: hub client + direct server
    const rnsA = new Reticulum({ logLevel: "debug" });
    const aHub = new TCPClientInterface({ host: HOST, port: hubPort });
    await aHub.connect();
    rnsA.addInterface(aHub, true);
    const aDirect = new TCPServerInterface({ port: directPort });
    await aDirect.connect();
    aDirect.addEventListener("connection", (/** @type {any} */ e) => {
      rnsA.addInterface(e.detail, true);
    });

    // Peer B: hub client + direct client
    const rnsB = new Reticulum({ logLevel: "debug" });
    const bHub = new TCPClientInterface({ host: HOST, port: hubPort });
    await bHub.connect();
    rnsB.addInterface(bHub, true);
    const bDirect = new TCPClientInterface({
      host: HOST,
      port: directPort,
    });
    await bDirect.connect();
    rnsB.addInterface(bDirect, true);

    // Room destinations, the y-reticulum way
    const roomName = "multi-interface-repro";
    const appName = await roomDestinationName(roomName);
    const identityA = await Identity.generate();
    const identityB = await Identity.generate();
    const destA = await Destination.IN(
      appName,
      DestType.SINGLE,
      identityA,
      rnsA,
    );
    const destB = await Destination.IN(
      appName,
      DestType.SINGLE,
      identityB,
      rnsB,
    );
    rnsA.registerDestination(destA);
    rnsB.registerDestination(destB);
    // The responder side: y-reticulum's Room wires this same listener
    const accepted = destB.addEventListener(
      "link_request",
      (/** @type {any} */ e) => {
        destB.acceptLink(e.detail.packet).catch(() => {});
      },
    );
    await destA.announce();
    await destB.announce();

    // Both sides hear the announces (via hub, direct, or both)
    await wait(2000);

    const targetHashB = fromHex(
      await roomDestinationHash(
        roomName,
        Array.from(identityB.identityHash)
          .map((b) => b.toString(16).padStart(2, "0"))
          .join(""),
      ),
    );

    // A dials B's room destination — the browser dial path: request a
    // path when none is known, wait for it to resolve
    if (!rnsA.transport.hasPath(targetHashB)) {
      await rnsA.transport.requestPath(targetHashB);
      const deadline = Date.now() + 10_000;
      while (!rnsA.transport.hasPath(targetHashB) && Date.now() < deadline) {
        await wait(250);
      }
    }
    assert.ok(
      rnsA.transport.hasPath(targetHashB),
      "A resolved a path to B with two parallel interfaces",
    );
    // Which interface won the path table?
    const route = rnsA.transport.routingTable.getRoute(targetHashB);
    console.log(
      "[multi-interface] route via:",
      route?.interface?.name ?? "?",
      "hops:",
      route?.hops,
    );

    // The link: a real y-reticulum dial opens one
    const out = await Destination.OUT(
      appName,
      DestType.SINGLE,
      identityB,
      rnsA,
    );
    // Diagnostic: log every transmit with its interface
    const originalTransmit = rnsA.transport._transmit.bind(rnsA.transport);
    rnsA.transport._transmit = async (
      /** @type {any} */ iface,
      /** @type {any} */ packet,
    ) => {
      console.log(
        `[tx] iface=${iface?.name} type=${packet.packetType} dest=${Array.from(
          packet.destinationHash ?? [],
        )
          .map((b) => b.toString(16).padStart(2, "0"))
          .join("")}`,
      );
      return originalTransmit(iface, packet);
    };
    const link = await out.createLink();
    assert.ok(link, "A opened a link to B over the multi-interface setup");

    for (const rns of [rnsA, rnsB, hub]) rns.stop();
  });

  it("control: a single direct interface per peer establishes a link", async () => {
    const directPort = await getFreePort();
    const rnsA = new Reticulum();
    const aDirect = new TCPServerInterface({ port: directPort });
    await aDirect.connect();
    aDirect.addEventListener("connection", (/** @type {any} */ e) => {
      rnsA.addInterface(e.detail, true);
    });
    const rnsB = new Reticulum();
    const bDirect = new TCPClientInterface({
      host: HOST,
      port: directPort,
    });
    await bDirect.connect();
    rnsB.addInterface(bDirect, true);

    const roomName = "single-interface-control";
    const appName = await roomDestinationName(roomName);
    const identityA = await Identity.generate();
    const identityB = await Identity.generate();
    const destA = await Destination.IN(
      appName,
      DestType.SINGLE,
      identityA,
      rnsA,
    );
    const destB = await Destination.IN(
      appName,
      DestType.SINGLE,
      identityB,
      rnsB,
    );
    rnsA.registerDestination(destA);
    rnsB.registerDestination(destB);
    // The responder side: y-reticulum's Room wires this same listener
    const accepted = destB.addEventListener(
      "link_request",
      (/** @type {any} */ e) => {
        destB.acceptLink(e.detail.packet).catch(() => {});
      },
    );
    await destA.announce();
    await destB.announce();
    await wait(2000);

    const targetHashB = fromHex(
      await roomDestinationHash(
        roomName,
        Array.from(identityB.identityHash)
          .map((b) => b.toString(16).padStart(2, "0"))
          .join(""),
      ),
    );
    if (!rnsA.transport.hasPath(targetHashB)) {
      await rnsA.transport.requestPath(targetHashB);
      const deadline = Date.now() + 10_000;
      while (!rnsA.transport.hasPath(targetHashB) && Date.now() < deadline) {
        await wait(250);
      }
    }
    assert.ok(rnsA.transport.hasPath(targetHashB), "control: path resolved");
    const out = await Destination.OUT(
      appName,
      DestType.SINGLE,
      identityB,
      rnsA,
    );
    const link = await out.createLink();
    assert.ok(link, "control: the link established");
    for (const rns of [rnsA, rnsB]) rns.stop();
  });
});
