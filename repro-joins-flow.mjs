// Drive the REAL app mesh layer (createMeshSync) against the live entry point,
// exactly like the Engine does: owner configures + starts, joiner joins via
// invite (handleJoinedViaInvite + rebind), owner approves via grants map.
import * as Y from "./vendor/yjs.js";
import { createProjectDoc, grantPermission } from "./src/crdt/ProjectDoc.js";
import { createMemoryStorage } from "./src/crdt/MeshConfig.js";
import { createMeshSync } from "./src/worker/MeshSync.js";

const messages = { owner: [], joiner: [] };

const mk = async (name) => {
  const doc = createProjectDoc(`${name} project`);
  const storage = createMemoryStorage();
  /** @param {any} m */
  const post = (m) => {
    messages[name].push(m);
    if (m.kind === "mesh-status" || m.kind === "mesh-requests") {
      console.log(`[${name}]`, JSON.stringify(m));
    }
  };
  const mesh = await createMeshSync({
    doc,
    postMessage: post,
    storage,
    roomFor: () => `noflo-ui:${doc.getMap("metadata").get("id")}`,
    autostart: false,
  });
  return { name, doc, storage, mesh };
};

const owner = await mk("owner");
const joiner = await mk("joiner");
const ROOM = `noflo-ui:${owner.doc.getMap("metadata").get("id")}`;
console.log(`owner room (invite): ${ROOM}`);

// Owner: enable mesh via configure, like the settings UI does
await owner.mesh.handleConfigure({
  ...owner.mesh.config,
  enabled: true,
  interfaces: [
    { id: "ws", type: "websocket", options: { url: "wss://cloud.lille-oe.de" }, enabled: true },
  ],
});

// Joiner: adopts the invited project identity (engine.js joinProject) then
// joins via invite
joiner.doc.getMap("metadata").set("id", ROOM.slice("noflo-ui:".length));
joiner.doc.getMap("grants").clear();
await joiner.mesh.handleJoinedViaInvite();
await joiner.mesh.rebind();

// Owner grants a "developer" role to the joiner's identity hash once the
// join request surfaces (simulates clicking Approve)
let approved = false;
const approve = setInterval(() => {
  const reqs = owner.mesh.joinRequests;
  if (!approved && reqs.length > 0) {
    approved = true;
    for (const r of reqs) {
      console.log(`[owner] approving join request from ${r.identityHash}`);
      grantPermission(owner.doc, r.identityHash, "developer");
    }
  }
}, 1000);

// Owner writes content; the joiner must converge once linked
owner.doc.getMap("doc").set("hello", "world");

const deadline = Date.now() + 120000;
const check = setInterval(() => {
  const joined =
    joiner.doc.getMap("doc").get("hello") === "world" &&
    joiner.doc.getMap("grants").size > 0;
  console.log(
    `[check] joiner hello=${String(joiner.doc.getMap("doc").get("hello"))} joinerGrants=${joiner.doc.getMap("grants").size} ownerRequests=${owner.mesh.joinRequests.length} approved=${approved}`,
  );
  if (joined || Date.now() > deadline) {
    clearInterval(check);
    clearInterval(approve);
    console.log(joined ? "RESULT: JOINED ✓" : "RESULT: FAILED ✗");
    process.exit(joined ? 0 : 1);
  }
}, 10000);
