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

## Boundaries

- ✅ **Always**: create a branch for any major change set (work document)
- ⚠️ **Ask first**: adding dependencies
- ⚠️ **Ask first**: modify CI config
- 🚫 **Never**: AI agents may not make commits on their own, instead notify user that there are uncommitted changes to review

