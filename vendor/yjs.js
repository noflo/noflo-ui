// The Yjs shim: the app standardizes on the npm package (work document
// #64's y-jedison integration needs one Yjs copy per execution context —
// foreign copies cannot insert types into a document's items). The page
// resolves the bare imports of the package's ESM entry through the
// import map's lib0 entries; the worker bundles its own engine (the
// build:worker script) because import maps do not apply there. Page and
// worker only ever exchange binary updates, which are copy-agnostic.
export * from "../node_modules/yjs/dist/yjs.mjs";
