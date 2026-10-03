/**
 * @file Vendor build entry for type generation: re-exports the
 * @reticulum/core type surface for the vendor bundle. The interface classes
 * are not re-exported by the package main (several pull in Node builtins),
 * and the package's types tree cannot yet be resolved through runtime
 * subpaths (fixed upstream by typesVersions in @reticulum/core >= 0.9.2) —
 * so the type entry imports the interface declarations from the types tree
 * directly. emitDtsOnly never emits JavaScript, so the runtime path is
 * untouched.
 */
export * from "@reticulum/core";
export { WebSocketClientInterface } from "@reticulum/core/types/src/interfaces/websocket.js";
export { WebRTCInterface } from "@reticulum/core/types/src/interfaces/webrtc.js";
