# AGENTS.md

## Project architecture

Read `SPEC.md` before planning any bigger changes.

## Code style

- Standard JavaScript
- Biome default formatting style
- TypeScript declarations in JsDoc format

## Work documents

Technical work is planned with work documents (in Markdown) that are managed using `rngit` tool and repository in `rns://3ea5aad068a337670f5bb8073226adb4/public/noflo-ui`. The appropriate [pi skill extension](https://github.com/bergie/pi-rngit-work-document-skill) should be available.

When planning new work, there should always be a corresponding work document created explaining the idea. When implementing, the appropriate work document should be kept up-to-date by posting updates to it. Agent may _propose_ work documents, not _create_ them.

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
