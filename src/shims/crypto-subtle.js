/**
 * @file Crypto shim for the vendored reticulum-core bundle (work document
 * #21): the bundle's `crypto` global resolves to this module, whose `subtle`
 * routes X25519 operations through the RFC 7748 polyfill on browsers that
 * lack native X25519 (WebKit), delegating everything else — including
 * Ed25519, HKDF, AES, HMAC — to the native implementation.
 *
 * This exists because shadowing `crypto.subtle` on the global object is not
 * reliable across browsers; a build-time alias is.
 */

import { createX25519SubtleProxy } from "./x25519-subtle.js";

const subtle = createX25519SubtleProxy(globalThis.crypto.subtle);

export default {
  getRandomValues: (/** @type {Uint8Array<ArrayBuffer>} */ array) =>
    globalThis.crypto.getRandomValues(array),
  subtle,
};
