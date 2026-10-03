/**
 * @file Vendor build entry (per SPEC "Build/Vendoring Mechanics"): exposes
 * the browser-safe surface of `@reticulum/core` as a single vendor module.
 *
 * The package main deliberately does not re-export interface classes —
 * several of them pull in Node builtins at the top level and would break
 * browsers. The WebSocket interface is the browser-relevant one, so it is
 * re-exported here explicitly; bundling it together with core keeps a single
 * shared instance of the core modules.
 */
export * from "@reticulum/core";
export { WebSocketClientInterface } from "@reticulum/core/src/interfaces/websocket.js";
