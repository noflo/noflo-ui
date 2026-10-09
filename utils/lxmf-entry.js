/**
 * @file Vendor build entry (per SPEC "Build/Vendoring Mechanics"): exposes
 * `@reticulum/lxmf` as a single vendor module.
 *
 * @reticulum/core stays external and re-points to the sibling
 * `reticulum-core.js` vendor bundle, so all contexts share exactly one
 * instance of the core protocol classes — the split-brain warning
 * (`two physical copies of @reticulum/core`) must never fire.
 */
export * from "@reticulum/lxmf";
