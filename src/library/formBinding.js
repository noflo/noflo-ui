/**
 * @file The shared-form adapter (work document #64): the Glass's
 * schema-driven forms (work document #57's subset) are not Jedison
 * instances, but y-jedison binds any editor satisfying its minimal
 * contract — a value getter, a value setter, and change subscriptions.
 * This adapter wraps a `noflo-schema-form` element in that contract.
 *
 * The in-house form has no initiator tagging; the binding's echo
 * protection holds anyway: the data setter re-renders synchronously, so
 * the remote-driven `form-change` events fire while the binding's
 * remote guard is up, and a user edit's echo writes nothing (the
 * reconciled value already matches).
 */

/**
 * The editor contract y-jedison binds against (the library's
 * `JedisonLike`; restated here because the installed package's type
 * surface does not export it).
 *
 * @typedef {Object} SharedFormEditor
 * @property {() => any} getValue - Current form data as plain JSON.
 * @property {(value: any, notifyParent?: boolean, initiator?: string) => any} setValue -
 *   Replace form data.
 * @property {(event: string, handler: (...args: any[]) => void) => void} on -
 *   Subscribe to a change event.
 * @property {(event: string, handler: (...args: any[]) => void) => void} off -
 *   Unsubscribe.
 */

/**
 * Wraps a schema-form element in the y-jedison editor contract.
 *
 * @param {HTMLElement} element A `noflo-schema-form` element carrying
 *   `data` accessors and the `form-change` event.
 * @returns {SharedFormEditor} The adapter.
 */
export function schemaFormBinding(element) {
  /** @type {Array<[any, any]>} */
  const listeners = [];
  return {
    getValue: () => /** @type {any} */ (element).data,
    setValue: (/** @type {any} */ value) => {
      /** @type {any} */ (element).data = value;
    },
    on: (/** @type {string} */ event, /** @type {any} */ handler) => {
      if (event !== "change") return;
      const wrapped = () => handler(undefined);
      listeners.push([handler, wrapped]);
      element.addEventListener("form-change", wrapped);
    },
    off: (/** @type {string} */ _event, /** @type {any} */ handler) => {
      const index = listeners.findIndex(([h]) => h === handler);
      if (index >= 0) {
        element.removeEventListener("form-change", listeners[index][1]);
        listeners.splice(index, 1);
      }
    },
  };
}
