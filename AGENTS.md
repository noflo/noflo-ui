# AGENTS.md

## Project architecture

Read `SPEC.md` before planning any bigger changes.

Read `VISUAL_GUIDELINES.md` before creating or modifying anything that renders (canvas, elements, panels, modals, menus).

Keep `VISUAL_GUIDELINES.md`'s **[implemented]/[target]** tags truthful as status evolves: a change that makes a `[target]` rule real re-tags it `[implemented]` (and drops the tag once nothing depends on the distinction) as part of that same change; new rules written ahead of code are tagged `[target]`. Verify against the code before citing any rule as implemented.

## Code style

- Standard JavaScript
- Biome default formatting style
- TypeScript declarations in JsDoc format

## Work documents

Technical work is planned with work documents (in Markdown) that are managed using `rngit` tool and repository in `rns://3ea5aad068a337670f5bb8073226adb4/public/noflo-ui`. The appropriate [pi skill extension](https://github.com/bergie/pi-rngit-work-document-skill) should be available.

When planning new work, there should always be a corresponding work document created explaining the idea. When implementing, the appropriate work document should be kept up-to-date by posting updates to it. Agent may _propose_ work documents, not _create_ them.

## Implementation roadmap

The current board-wide sequencing is recorded in work document #30 update #5. Summary:

- **Phase 0 (alongside the CRDT/mesh work)**: #28 corner shell + sync panel, #34 operation narration, #37 enforceable IPC contract — one workstream: make the mesh legible while rebuilding its trust model
- **Phase 1 (hygiene)**: #11 typed events, #24 vendor type declarations
- **Phase 2 (editor round, post-CRDT-stability)**: #29 component implementation flow, then #5 + #35 (subway metaphor)
- **Phase 3 (interchange, gated on the noflo board)**: #22 git client (needs canonical FBP serialization, noflo WD #10), #15 + #36 runtime (noflo WD #4), #16 fbp-spec UI (noflo WD #5)
- **Future work**: #7 file sync, #31 AI participants, #32 home graph, #33 Tauri packaging
- #30 is the binding document each phase consults, not a phase member

When picking up new work, follow this order unless the user directs otherwise; revisit when an external gate moves.

## Spatial constraints on editor canvas

The `src/library/SpaceManager.js` is to be the ultimate authority on where items are on a canvas, where they can be placed, etc. Use it for any such decisions. If new helpers are needed, add them.

## Type definitions

Every API interface needs to have TypeScript definitions in JsDoc format. Run `npm run types` after every change to verify compatibility.

## Boundaries

- ✅ **Always**: write at least smoketests for any new functionality
- ✅ **Always**: ensure type safety. Always check eith `npm run types` after changes and fix as needed
- ✅ **Always**: fix formatting with `npm run format` (in Android/Termux `biome check --use-editorconfig=true --write src/ spec/ index.html`) after any changes to source files or tests
- ✅ **Always**: Use `git mv` instead of `mv' for renaming files
- ✅ **Always**: Remove ambiguity and legacy support from APIs you modify. Right now there are no API consumers outside this repo so we don't need to worry about backwards compatibility
- ⚠️ **Ask first**: adding dependencies
- ⚠️ **Ask first**: modify CI config
- ⚠️ **Ask first**: allow an optional input to a method
- 🚫 **Never**: AI agents may not make commits on their own, instead notify user that there are uncommitted changes to review
- 🚫 **Never**: AI agents may not mark work documents completed on their own, instead ask user to do so
- ✅ **In this repo**: agents may make commits, but keep them atomic (one logical change per commit) and ensure the build is green — tests, type checks, and formatting clean — before committing
