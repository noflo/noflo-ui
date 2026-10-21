/**
 * @file The LXMF message store (work document #61: thread history is
 * local per device, as LXMF clients conventionally keep it). Messages
 * persist in their **actual LXMF wire form** — the canonical
 * `[destHash][sourceHash][signature][payload]` blob that deserializes
 * again with the device identity, signature intact — so history is a
 * faithful LXMF artifact rather than an ad-hoc rendering.
 *
 * At-rest secrecy: the LXMF wire form itself carries plaintext content
 * (LXMF encrypts at the packet layer in transit — the same reason
 * Sideband encrypts its database). Each record is therefore sealed in an
 * AES-GCM envelope whose key derives from the **device's mesh identity
 * private key** (HKDF): no second secret to back up, and a stolen store
 * is unreadable without the identity. Restoring the identity restores
 * the history.
 *
 * Runtime-agnostic: the KV storage is injected (IndexedDB in the
 * browser, the caller's storage elsewhere) and the crypto is WebCrypto,
 * which both the worker and Node provide.
 */

import { LXMessage } from "../../vendor/lxmf.js";
import { wireForm } from "./protocol.js";

const NAME_INFO = "noflo-ui lxmf history v1";

/** One stored message, decrypted. */
/**
 * @typedef {Object} StoredMessage
 * @property {string} id The LXMF message id (hex).
 * @property {"in" | "out"} direction
 * @property {string} text
 * @property {string} title
 * @property {number} time Device-local receive/send time (ms epoch).
 */

/**
 * Creates the LXMF history store.
 *
 * @param {object} deps
 * @param {{ get: (key: string) => Promise<any>, set: (key: string, value: any) => Promise<void> }} deps.storage
 *   The KV storage (IndexedDB-backed in the browser).
 * @param {any} deps.identity The device's mesh identity — the store key
 *   derives from its private key material.
 * @param {(msg: string) => void} [deps.log]
 * @returns {Promise<{
 *   append: (peerIdentityHash: string, direction: "in" | "out", message: any) => Promise<boolean>,
 *   thread: (peerIdentityHash: string) => Promise<StoredMessage[]>,
 *   peers: () => Promise<string[]>,
 * }>}
 */
export async function createLxmfStore({ storage, identity, log = () => {} }) {
  // The envelope key: HKDF over the identity's private key material. The
  // 128-byte native form carries the X25519 and Ed25519 private halves —
  // both device-bound, never exported by the app (#42's backup story is
  // the only path that moves them)
  const privateKey = await identity.getPrivateKey();
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    /** @type {any} */ (privateKey),
    "HKDF",
    false,
    ["deriveKey"],
  );
  const aesKey = await crypto.subtle.deriveKey(
    {
      name: "HKDF",
      hash: "SHA-256",
      salt: new Uint8Array(0),
      info: new TextEncoder().encode(NAME_INFO),
    },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );

  /**
   * Seals a record into its at-rest envelope: `iv || ciphertext` (JSON of
   * the wire form and metadata), base64.
   *
   * @param {{ wire: string, time: number, direction: "in" | "out" }} record
   * @returns {Promise<string>}
   */
  async function seal(record) {
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const ciphertext = await crypto.subtle.encrypt(
      { name: "AES-GCM", iv },
      aesKey,
      new TextEncoder().encode(JSON.stringify(record)),
    );
    const sealed = new Uint8Array(iv.length + ciphertext.byteLength);
    sealed.set(iv, 0);
    sealed.set(new Uint8Array(ciphertext), iv.length);
    return bytesToBase64(sealed);
  }

  /**
   * Opens a sealed record.
   *
   * @param {string} blob
   * @returns {Promise<{ wire: string, time: number, direction: "in" | "out" } | null>}
   */
  async function open(blob) {
    try {
      const sealed = base64ToBytes(String(blob));
      const iv = sealed.slice(0, 12);
      const plaintext = await crypto.subtle.decrypt(
        { name: "AES-GCM", iv },
        aesKey,
        sealed.slice(12),
      );
      return JSON.parse(new TextDecoder().decode(plaintext));
    } catch (err) {
      // A record sealed under a different identity (device migration with
      // an old store) or corruption: skip it, never crash the history
      log(
        `lxmf store: record unreadable (${/** @type {any} */ (err)?.message ?? err})`,
      );
      return null;
    }
  }

  /**
   * Appends a message to a peer's thread. The message's wire form is
   * taken from its retained signature material — both sent (post-
   * serialize) and received (post-deserialize) LXMessage instances carry
   * it. Duplicate message ids are dropped (the router's deduplication,
   * continued at rest).
   *
   * @param {string} peerIdentityHash The thread key (the roster's hash).
   * @param {"in" | "out"} direction
   * @param {any} message The LXMessage instance.
   * @returns {Promise<boolean>} Whether the message was stored.
   */
  async function append(peerIdentityHash, direction, message) {
    const wire = wireForm(message);
    if (!wire) return false;
    const id =
      message.messageId instanceof Uint8Array
        ? bytesToHex(message.messageId)
        : null;
    if (!id) return false;
    const indexKey = `lxmf-thread:${peerIdentityHash}`;
    const index = await storage
      .get(indexKey)
      .then(
        (/** @type {any} */ value) =>
          /** @type {Array<{ id: string, time: number, direction: "in" | "out" }>} */ (
            Array.isArray(value) ? value : []
          ),
      )
      .catch(
        () =>
          /** @type {Array<{ id: string, time: number, direction: "in" | "out" }>} */ ([]),
      );
    if (index.some((/** @type {any} */ entry) => entry.id === id)) {
      return false;
    }
    const time = Date.now();
    const sealed = await seal({
      wire: bytesToBase64(wire),
      time,
      direction,
    });
    await storage.set(`lxmf-msg:${id}`, sealed);
    index.push({ id, time, direction });
    await storage.set(indexKey, index);
    const peers = await storage
      .get("lxmf-peers")
      .then(
        (/** @type {any} */ value) =>
          /** @type {string[]} */ (Array.isArray(value) ? value : []),
      )
      .catch(() => /** @type {string[]} */ ([]));
    if (!peers.includes(peerIdentityHash)) {
      peers.push(peerIdentityHash);
      await storage.set("lxmf-peers", peers);
    }
    return true;
  }

  /**
   * Loads a peer's thread: decrypts each record and deserializes the wire
   * form back into a readable message.
   *
   * @param {string} peerIdentityHash
   * @returns {Promise<StoredMessage[]>}
   */
  async function thread(peerIdentityHash) {
    const index = await storage
      .get(`lxmf-thread:${peerIdentityHash}`)
      .then((value) => (Array.isArray(value) ? value : []))
      .catch(() => []);
    /** @type {StoredMessage[]} */
    const messages = [];
    for (const entry of index) {
      const blob = await storage.get(`lxmf-msg:${entry.id}`).catch(() => null);
      if (!blob) continue;
      const record = await open(blob);
      if (!record) continue;
      try {
        const parsed = await LXMessage.deserialize(base64ToBytes(record.wire));
        const text =
          typeof parsed.content === "string"
            ? parsed.content
            : new TextDecoder().decode(parsed.content ?? new Uint8Array());
        if (!text.trim()) continue;
        messages.push({
          id: String(entry.id),
          direction: record.direction,
          text,
          title: typeof parsed.title === "string" ? parsed.title : "",
          time: record.time,
        });
      } catch (err) {
        log(
          `lxmf store: wire form unreadable (${/** @type {any} */ (err)?.message ?? err})`,
        );
      }
    }
    return messages.sort((a, b) => a.time - b.time);
  }

  /**
   * The peers with stored threads, oldest thread first.
   *
   * @returns {Promise<string[]>}
   */
  async function peers() {
    return storage
      .get("lxmf-peers")
      .then((value) => (Array.isArray(value) ? value : []))
      .catch(() => []);
  }

  return { append, thread, peers };
}

/**
 * @param {Uint8Array} bytes
 * @returns {string}
 */
function bytesToBase64(bytes) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

/**
 * @param {string} base64
 * @returns {Uint8Array}
 */
function base64ToBytes(base64) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

/**
 * @param {Uint8Array} bytes
 * @returns {string}
 */
function bytesToHex(bytes) {
  return Array.from(bytes)
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}
