# AGENTS.md

## Project architecture

Read `SPEC.md` before doing any planning or work.

## Code style

- Standard JavaScript
- Biome default formatting style

## Work documents

Technical work is planned with work documents (in Markdown) that are managed using `rngit` tool and repository in `rns://3ea5aad068a337670f5bb8073226adb4/public/noflo-ui`. Commands to read work documents:

- List work documents: `rngit work rns://3ea5aad068a337670f5bb8073226adb4/public/noflo-ui list`.
- Read work document: `rngit work rns://3ea5aad068a337670f5bb8073226adb4/public/noflo-ui view -d N` (where `N` is the document number from the work documents list)

AI agents may not create work documents on their own. Create a markdown file in the root folder of the project and ask user to move it to rngit.

## Boundaries

- ✅ **Always**: create a branch for any major change set (work document)
- ✅ **Always**: write at least smoketests for any new functionality
- ✅ **Always**: fix formatting with `npm run format` after any changes to source files or tests
- ⚠️ **Ask first**: adding dependencies
- ⚠️ **Ask first**: modify CI config
- 🚫 **Never**: AI agents may not make commits on their own, instead notify user that there are uncommitted changes to review

