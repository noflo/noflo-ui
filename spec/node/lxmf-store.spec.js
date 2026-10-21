import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { wireForm } from "../../src/lxmf/protocol.js";
import { createLxmfStore } from "../../src/lxmf/store.js";
import { LXMessage } from "../../vendor/lxmf.js";
import { Identity } from "../../vendor/reticulum-core.js";

/** A key-value storage backed by a Map (the AsyncStorage shape). */
function memoryStorage() {
  const map = new Map();
  return {
    get: async (key) => map.get(key) ?? null,
    set: async (key, value) => {
      map.set(key, value);
    },
    /** The raw store, for the at-rest assertions. */
    map,
  };
}

/** Builds a serialized LXMF message from `sender` to `recipient`. */
async function buildMessage(sender, recipient, content, title = "") {
  const message = new LXMessage({
    sourceHash: sender.identityHash,
    destinationHash: recipient.identityHash,
    content,
    ...(title ? { title } : {}),
  });
  await message.serialize(sender);
  return message;
}

const PEER = "aa".repeat(32);

describe("LXMF wire form reconstruction", () => {
  it("round-trips a sent message through its canonical wire form", async () => {
    const sender = await Identity.generate();
    const recipient = await Identity.generate();
    const message = await buildMessage(
      sender,
      recipient,
      "hello from the wire",
      "pi",
    );
    const wire = wireForm(message);
    assert.ok(wire instanceof Uint8Array, "the wire form exists");
    const parsed = await LXMessage.deserialize(wire);
    assert.equal(parsed.content, "hello from the wire");
    assert.equal(parsed.title, "pi");
    assert.ok(
      parsed.signedPart,
      "the parsed message carries signature material",
    );
    assert.equal(
      await parsed.verifySignature(sender),
      true,
      "the original signature verifies over the reconstructed form",
    );
  });

  it("returns null for a message that was never serialized", async () => {
    const sender = await Identity.generate();
    const recipient = await Identity.generate();
    const message = new LXMessage({
      sourceHash: sender.identityHash,
      destinationHash: recipient.identityHash,
      content: "never sent",
    });
    assert.equal(wireForm(message), null);
  });
});

describe("LXMF history store (work document #61)", () => {
  it("persists in sealed wire form and restores readable history", async () => {
    const storage = memoryStorage();
    const device = await Identity.generate();
    const peerIdentity = await Identity.generate();
    const store = await createLxmfStore({
      storage,
      identity: device,
      log: () => {},
    });

    const inbound = await buildMessage(
      peerIdentity,
      device,
      "the agent's reply",
      "pi",
    );
    const outbound = await buildMessage(
      device,
      peerIdentity,
      "the user's prompt",
    );
    assert.equal(await store.append(PEER, "in", inbound), true);
    assert.equal(await store.append(PEER, "out", outbound), true);

    // The at-rest record is sealed: the storage never holds plaintext
    for (const [key, value] of storage.map) {
      if (key.startsWith("lxmf-msg:")) {
        assert.equal(
          String(value).includes("the agent's reply"),
          false,
          "the wire form is not readable at rest",
        );
        assert.equal(
          String(value).includes("the user's prompt"),
          false,
          "the envelope hides the content",
        );
      }
    }

    const history = await store.thread(PEER);
    assert.equal(history.length, 2);
    assert.equal(history[0].direction, "in");
    assert.equal(history[0].text, "the agent's reply");
    assert.equal(history[0].title, "pi");
    assert.equal(history[1].direction, "out");
    assert.equal(history[1].text, "the user's prompt");
    assert.deepEqual(await store.peers(), [PEER]);
  });

  it("deduplicates by message id and survives a store reopen", async () => {
    const storage = memoryStorage();
    const device = await Identity.generate();
    const peerIdentity = await Identity.generate();
    const store = await createLxmfStore({
      storage,
      identity: device,
      log: () => {},
    });
    const inbound = await buildMessage(peerIdentity, device, "once");
    assert.equal(await store.append(PEER, "in", inbound), true);
    assert.equal(
      await store.append(PEER, "in", inbound),
      false,
      "the same message id stores once",
    );

    // A reopened store (restart) decrypts the same records with the same
    // device identity
    const reopened = await createLxmfStore({
      storage,
      identity: device,
      log: () => {},
    });
    const history = await reopened.thread(PEER);
    assert.deepEqual(
      history.map((m) => m.text),
      ["once"],
    );

    // A different identity cannot read the records: the envelope key
    // derives from the device's private key
    const stranger = await Identity.generate();
    const strangerStore = await createLxmfStore({
      storage,
      identity: stranger,
      log: () => {},
    });
    assert.deepEqual(
      await strangerStore.thread(PEER),
      [],
      "another identity's store reads nothing",
    );
  });
});
