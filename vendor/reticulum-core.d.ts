/**
 * Type surface for the vendored @reticulum/core bundle (built from
 * utils/reticulum-entry.js, which appends the browser-relevant WebSocket
 * interface to the package main). Only the surface first-party code uses is
 * declared; the implementation is checked at the seams with runtime tests.
 */
export const Identity: any;
export const Reticulum: any;
export const WebSocketClientInterface: any;
export const WebRTCSignaling: any;
export const WebRTCInterface: any;
export const Destination: any;
export const DestType: any;
export const toHex: (...args: any[]) => string;
export const Channel: any;
export const Link: any;
export const MemoryStorageAdapter: any;
export const Persistor: any;
