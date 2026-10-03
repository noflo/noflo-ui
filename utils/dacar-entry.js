/**
 * First-party entry for the vendored Dacar bundle: the pure core (state,
 * operations, evaluation engine) plus the §11 direct-link Delta push
 * transport — the first Dacar transport adopted in a browser runtime.
 *
 * The direct-link transport is vendored explicitly (not via the
 * `@reticulum/dacar/transport` subpath, whose index also pulls the LXMF and
 * RFed adapters this application does not run yet). The deep module path is
 * not in the package's exports map, so the source file is referenced
 * directly; `@reticulum/core` stays external to the sibling vendor bundle.
 *
 * Bundled as one module so all contexts share one Dacar instance, mirroring
 * the sibling yjs / reticulum-core / y-reticulum vendor contracts.
 */
export * from "@reticulum/dacar";
export * from "../node_modules/@reticulum/dacar/src/transport/rnsSync.js";
