/**
 * @file Browser shim for Node's `events` module, used by the vendor bundler.
 * noflo/fbp-graph expect Node's EventEmitter API surface; eventemitter3
 * (the browser-friendly implementation) lacks `setMaxListeners`, which
 * fbp-graph's Graph constructor calls.
 */

import { EventEmitter as EventEmitter3 } from "eventemitter3";

/**
 * eventemitter3 with the Node EventEmitter methods the vendored dependencies
 * call. Unbounded listener caps are the intended behavior here.
 */
export class EventEmitter extends EventEmitter3 {
  /**
   * Node API no-op: eventemitter3 has no listener cap to raise.
   *
   * @param {number} _n
   * @returns {this}
   */
  setMaxListeners(_n) {
    return this;
  }
}

export default EventEmitter;
