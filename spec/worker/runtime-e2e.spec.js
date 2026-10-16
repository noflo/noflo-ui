import assert from "node:assert/strict";
import net from "node:net";
import { describe, it } from "node:test";
import * as Repeat from "@noflo/core/components/Repeat.js";
import {
  CMD_PROCESS_LIST_REQ,
  COMPONENT_TYPE,
  EXECUTION_STATE,
  encodeProcessList,
} from "@noflo/fbp-protocol";
import { GraphModel } from "@noflo/graph";
import { ComponentLoader } from "@noflo/noflo";
import { assembleRuntime, bindReticulum } from "@noflo/runtime";
import { DacarCapabilityPolicy } from "@noflo/runtime/dacar";
import { Identity, Reticulum as PackageReticulum } from "@reticulum/core";
import {
  Config,
  DeltaReceiver,
  Engine,
  Keyring,
  StateVector,
} from "@reticulum/dacar";
import { TCPClientInterface, TCPServerInterface } from "@reticulum/node";
import { createRuntimeBridge } from "../../src/worker/RuntimeBridge.js";
import {
  Action,
  NamespaceHasher,
  Operation,
  packHlc,
  Tuple,
} from "../../vendor/dacar.js";
// The client side rides the vendor bundle: the bridge's vendored
// runtime-client must share module identity with the Reticulum instance it
// is handed (one core instance per side of the wire)
import {
  fromHex,
  Reticulum,
  toHex,
  Identity as VendorIdentity,
} from "../../vendor/reticulum-core.js";

const HOST = "127.0.0.1";
const RUNTIME_OBJECT = "noflo-ui:runtime:e2e-runtime";
const ALL_RELATION = "access";

/**
 * Resolves with a free localhost TCP port (the probe-close-reuse race
 * retries a few times, same as loopback-peer.js).
 *
 * @returns {Promise<number>}
 */
function getFreePort() {
  const attempt = (/** @type {number} */ tries) =>
    new Promise((resolve, reject) => {
      const probe = net.createServer();
      probe.unref();
      probe.on("error", reject);
      probe.listen({ host: HOST, port: 0 }, () => {
        const { port } = /** @type {net.AddressInfo} */ (probe.address());
        probe.close(() => resolve(port));
      });
    }).catch(() => {
      if (tries <= 0) throw new Error("no free port");
      return new Promise((r) => setTimeout(r, 50)).then(() =>
        attempt(tries - 1),
      );
    });
  return attempt(5);
}

/**
 * Polls a condition until it holds or the timeout hits (the join-e2e
 * pattern): mesh convergence is asynchronous by design.
 *
 * @template T
 * @param {() => T | undefined | null} condition
 * @param {number} timeoutMs
 * @param {string} label
 * @returns {Promise<T>}
 */
async function waitFor(condition, timeoutMs, label) {
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    const value = condition();
    if (value !== undefined && value !== null && value !== false) return value;
    if (Date.now() > deadline) {
      throw new Error(`timed out waiting for ${label}`);
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
}

/**
 * Mints a coarse runtime grant the way the grant wallet would (work
 * document #59's role → relation mapping): the Trust Anchor signs one
 * Operation over the runtime object with the all-relations relation, as a
 * §11.1 delta batch. Uses the vendor Dacar stack — the same copies the
 * noflo-ui side runs — so the E2E also proves the wire format crosses
 * implementations.
 *
 * @param {InstanceType<typeof VendorIdentity>} anchorIdentity The noflo-ui
 *   device identity — the project's Trust Anchor.
 * @param {string} subjectHex The granted peer's identity hash.
 * @param {string} saltHex The project's privacy salt.
 * @returns {Promise<Uint8Array>} The §11.1 delta batch.
 */
async function mintRuntimeGrant(anchorIdentity, subjectHex, saltHex) {
  const anchorHash = toHex(anchorIdentity.getSalt());
  const hasher = new NamespaceHasher(fromHex(saltHex));
  const tuple = await Tuple.fromPlaintext({
    objectId: RUNTIME_OBJECT,
    relation: ALL_RELATION,
    grantee: fromHex(subjectHex),
    issuer: fromHex(anchorHash),
    hasher,
  });
  const operation = await new Operation({
    tuple,
    action: Action.GRANT,
    hlc: packHlc(Date.now(), 0),
  }).sign(anchorIdentity);
  return DeltaReceiver.packPayloads([operation.toPayload()]);
}

/**
 * Boots the live runtime host: the assembled @noflo/runtime on its own
 * Reticulum instance (the package copy — the runtime's binding and protocol
 * stack share module identity with the package, not with the vendor
 * bundle), authorized by the Dacar capability policy — deny closed until
 * the Trust Anchor's grant reaches the engine. The announce binding is a
 * separate step: the binding announces at bind time and the announce
 * cadence floor is minutes, so a test connects its client before binding.
 *
 * @param {object} options
 * @param {string} options.anchorHashHex The Trust Anchor's identity hash.
 * @param {string} options.anchorPubkeyHex The Trust Anchor's public key.
 * @param {string} options.saltHex The project's privacy salt.
 * @returns {Promise<{ graph: GraphModel, ingestGrant: (batch: Uint8Array) => Promise<void>, bind: () => Promise<any>, stop: () => Promise<void> }>}
 */
async function bootRuntime({ port, anchorHashHex, anchorPubkeyHex, saltHex }) {
  const rns = new PackageReticulum();
  const server = new TCPServerInterface({ port });
  await server.connect();
  server.addEventListener("connection", (/** @type {any} */ event) => {
    rns.addInterface(event.detail, true);
  });
  // The runtime-side Dacar engine (work document #59): the application
  // constructs it — trust anchor, privacy salt, state — and keeps it
  // current via delta sync; the adapter only evaluates. In production the
  // Companion's bootstrap hands this state over; here the test ingests the
  // minted batch the same way the delta sync would deliver it.
  const config = new Config({
    rootTrustAnchors: [fromHex(anchorHashHex)],
    primarySalt: fromHex(saltHex),
  });
  const state = new StateVector();
  const keyring = new Keyring().registerSingle(
    fromHex(anchorHashHex),
    fromHex(anchorPubkeyHex),
  );
  const receiver = new DeltaReceiver(state, keyring);
  const engine = new Engine(config, state);
  const policy = new DacarCapabilityPolicy({
    engine,
    objectId: RUNTIME_OBJECT,
    allRelation: ALL_RELATION,
  });
  // The server resolves the policy as a plain function call — the
  // DacarCapabilityPolicy instance is the application-side adapter the
  // function delegates to
  const capabilityPolicy = (identityHash, context) =>
    policy.resolve(identityHash, context);
  const graph = new GraphModel({ name: "main" });
  const loader = new ComponentLoader({
    registry: { list: () => ({ "core/Repeat": Repeat }) },
  });
  const runtime = await assembleRuntime({
    graph,
    catalog: { signatures: () => ({}) },
    componentLoader: loader,
    capabilityPolicy,
    capabilities: 0xff,
    autostart: false,
  });
  // Upstream gap (@noflo/runtime, PR noflo/noflo#1085 pending release):
  // `0x44` has no handler — the §8 process listing is not implemented yet,
  // so a client's request draws silence. The harness derives the listing
  // from the graph model: declared components, elementary kind, execution
  // state from whether a network is built. The graph protocol's sync-reply
  // plane-id bug needed the same treatment until alpha.5, where it is
  // fixed upstream and this harness dropped its patch.
  runtime.server.registerHandler(
    CMD_PROCESS_LIST_REQ,
    (/** @type {any} */ decoded, /** @type {any} */ context) => {
      /** @type {Record<string, { component: string, type: string, state: number }>} */
      const entries = {};
      for (const node of graph.nodes()) {
        // Placeholder nodes have no component and no process to list —
        // encoding an empty name would take the listing into wire silence
        const component = node.component;
        if (!component) continue;
        entries[node.entity_id] = {
          component,
          type: COMPONENT_TYPE.ELEMENTARY,
          state: runtime.host.network
            ? EXECUTION_STATE.ENABLED
            : EXECUTION_STATE.DISABLED,
        };
      }
      runtime.graph
        .epoch()
        .then((epoch) =>
          runtime.server.send(encodeProcessList(epoch, entries), context),
        )
        .catch(() => {});
    },
  );
  /** @type {any} */
  let binding = null;
  return {
    graph,
    ingestGrant: async (/** @type {Uint8Array} */ batch) => {
      await receiver.applyPayloads(batch, { maxFutureMs: null });
    },
    bind: async () => {
      const identity = await Identity.generate();
      binding = await bindReticulum({
        runtime,
        reticulum: rns,
        identity,
        nodeName: "e2e-runtime",
      });
      return binding;
    },
    stop: async () => {
      binding?.stop();
      await rns.stop().catch(() => {});
    },
  };
}

describe("runtime bridge E2E against a live @noflo/runtime (work document #59)", () => {
  it("establishes trust through Dacar, then deploys, runs, and observes", {
    timeout: 45_000,
  }, async () => {
    // The noflo-ui side: the device's mesh identity is the project's
    // Trust Anchor (work document #25's default ownership); the privacy
    // salt is local configuration shared with the runtime out of band
    const anchorIdentity = await VendorIdentity.generate();
    const anchorHashHex = toHex(anchorIdentity.getSalt());
    const anchorPubkeyHex = toHex(await anchorIdentity.getPublicKey());
    const saltHex = toHex(crypto.getRandomValues(new Uint8Array(32)));

    const port = await getFreePort();
    const host = await bootRuntime({
      port,
      anchorHashHex,
      anchorPubkeyHex,
      saltHex,
    });

    // The client side: a vendor-bundle Reticulum dialing the loopback
    const rns = new Reticulum();
    const client = new TCPClientInterface({
      host: HOST,
      port,
    });
    await client.connect();
    rns.addInterface(client, true);
    const clientIdentity = await VendorIdentity.generate();
    const clientHashHex = toHex(clientIdentity.getSalt());

    /** @type {any[]} */
    const echoes = [];
    const view = {
      nodes: [
        { id: "a", component: "core/Repeat", metadata: {} },
        { id: "b", component: "core/Repeat", metadata: {} },
      ],
      edges: [
        {
          from: { node: "a", port: "out", index: 0 },
          to: { node: "b", port: "in", index: 0 },
          metadata: {},
        },
      ],
      initializers: [],
      inports: {},
      outports: {},
      groups: [],
    };
    const bridge = createRuntimeBridge({
      getReticulum: () => rns,
      getIdentity: async () => clientIdentity,
      projectGraph: (graphId) => (graphId === "main" ? view : null),
      postMessage: (echo) => echoes.push(echo),
    });
    bridge.attach();

    // The runtime binds after the client is up: its bind-time announce
    // reaches the connected peer immediately
    await host.bind();

    try {
      // Discovery: the runtime's announce decodes into the population
      const discovered = await waitFor(
        () =>
          echoes.find((echo) => echo.kind === "runtime-discovered")
            ?.runtimes?.[0],
        10_000,
        "the runtime announce",
      );
      assert.equal(discovered.nodeName, "e2e-runtime");
      const hash = discovered.destinationHash;

      // Deny closed (work document #59's Dacar section): before any grant
      // reaches the runtime's engine, the peer connects but earns no
      // capabilities
      await bridge.connect(hash);
      const denied = await waitFor(
        () =>
          echoes.find(
            (echo) =>
              echo.kind === "runtime-connection" && echo.state === "connected",
          ),
        10_000,
        "the deny-closed connection",
      );
      assert.equal(denied.capabilityMask, 0, "no grant, no capabilities");

      // The grant establishment: the anchor mints the coarse runtime
      // grant, the runtime's engine ingests it — the delta-sync delivery
      // in production, the bootstrap handoff in the Companion's case
      const batch = await mintRuntimeGrant(
        anchorIdentity,
        clientHashHex,
        saltHex,
      );
      await host.ingestGrant(batch);

      // Reconnect: the fresh link resolves through the policy again
      await bridge.disconnect(hash);
      await bridge.connect(hash);
      const connection = await waitFor(
        () =>
          echoes.find(
            (echo) =>
              echo.kind === "runtime-connection" &&
              echo.state === "connected" &&
              echo.capabilityMask === 0xff,
          ),
        10_000,
        "the granted connection",
      );
      assert.deepEqual(connection.capabilities, ["all"]);

      // Deploy: the runtime's graph converges onto the project's entities
      await bridge.deploy(hash, "main");
      const deployed = echoes.find(
        (echo) => echo.kind === "runtime-deploy" && echo.state === "deployed",
      );
      assert.ok(deployed, "the deploy reports deployed");
      assert.equal(deployed.ops, 3, "node, node, edge streamed");
      await waitFor(
        () =>
          host.graph.nodes().length === 2 && host.graph.edges().length === 1,
        10_000,
        "the runtime's graph convergence",
      );
      assert.ok(host.graph.node("a"), "entity ids converge");

      // Run: run control starts the network. The runtime does not echo
      // 0x40 back to the requester — the state surfaces through the
      // process listing, which the bridge requests after the run command
      await bridge.run(hash, "start");
      const processes = await waitFor(
        () => {
          // The listing echoes arrive per request; the latest is the one
          // that reflects the post-start state
          const reports = echoes.filter(
            (echo) =>
              echo.kind === "runtime-processes" &&
              echo.destinationHash === hash,
          );
          const report = reports[reports.length - 1];
          return report?.entries?.a ? report : undefined;
        },
        15_000,
        "the post-start process listing",
      );
      assert.ok(processes.entries.a, "the listing carries the deployed nodes");
      assert.equal(processes.entries.a.component, "core/Repeat");
      assert.ok(processes.entries.b, "both nodes listed");
    } finally {
      await bridge.stop().catch(() => {});
      await host.stop();
      await rns.stop().catch(() => {});
    }
  });
});
