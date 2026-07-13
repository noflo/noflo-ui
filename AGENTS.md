# AGENTS.md

## Project architecture

Read `SPEC.md` before doing any planning or work.

## Code style

- Standard JavaScript
- Biome default formatting style
- TypeScript declarations in JsDoc format

## Work documents

Technical work is planned with work documents (in Markdown) that are managed using `rngit` tool and repository in `rns://3ea5aad068a337670f5bb8073226adb4/public/noflo-ui`. Commands to read work documents:

- List work documents: `rngit work rns://3ea5aad068a337670f5bb8073226adb4/public/noflo-ui list`.
- Read work document: `rngit work rns://3ea5aad068a337670f5bb8073226adb4/public/noflo-ui view -d N` (where `N` is the document number from the work documents list)

AI agents may not create work documents on their own. Create a markdown file in the root folder of the project and ask user to move it to rngit.

## Spatial constraints on editor canvas

The `src/library/SpaceManager.js` is to be the ultimate authority on where items are on a canvas, where they can be placed, etc. Use it for any such decisions. If new helpers are needed, add them.

## Boundaries

- ✅ **Always**: create a branch for any major change set (work document)
- ✅ **Always**: write at least smoketests for any new functionality
- ✅ **Always**: ensure type safety. Always check eith `npm run types` after changes and fix as needed
- ✅ **Always**: fix formatting with `npm run format` after any changes to source files or tests
- ✅ **Always**: Use `git mv` instead of `mv' for renaming files
- ✅ **Always**: Remove ambiguity and legacy support from APIs you modify. Right now there are no API consumers outside this repo so we can keep things fluid
- ⚠️ **Ask first**: adding dependencies
- ⚠️ **Ask first**: modify CI config
- ⚠️ **Ask first**: allow an optional input to a method
- 🚫 **Never**: AI agents may not make commits on their own, instead notify user that there are uncommitted changes to review

