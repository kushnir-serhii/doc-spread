# 030 — Templates in the real app: a new company starts with ready types

**Status:** draft · **Depends on:** 023 · **Route(s):** `/onboarding`, `/types`, `/types/new`

## Goal
A company that signs up for real (mocks off) can pick ready document types (Invoice, Receipt, Contract) in onboarding and in the type list, exactly as the demo does, instead of starting from an empty list and building every field by hand. Today the real mode returns no templates at all (`noTemplates` in `src/lib/api/document-types.ts`), so a new customer can't do anything useful until they learn the builder: the biggest obstacle on a first visit.

## Scope
- In:
  - The templates are product data, not company data: move `DOCUMENT_TEMPLATES` out of `src/lib/mock/` into a module both modes use, and make `useTemplates` return them in real mode too.
  - Creating a type from a template in real mode (onboarding's types step, the template gallery and template builder in `/types`) through the existing `realCreateDocumentType(s)`.
  - Checking that every template parses in the pipeline (`parseFieldDefs`) and that the eval copies in `evals/types/` still match (their drift test).
- Out: templates stored in the database or edited by an admin; new templates beyond the three that exist; AI features of the builder (propose fields, type from a sample).

## Data
- `DOCUMENT_TEMPLATES` and the `DocumentTemplate` type (from `@/lib/mock/types`) move to `src/lib/fields/templates.ts` (or similar, outside `lib/mock`). The mock data keeps importing it, so nothing is duplicated.
- `useTemplates()` returns the same list in both modes; no new query hook.
- No database change: a type created from a template is an ordinary type with its first version.

## Slices

### [ ] 1. Templates in both modes
- **Build:** move the templates out of `lib/mock`, update imports (`mock/api.ts`, `api/document-types.ts`, the evals drift test's source path), and make `useTemplates` return them with mocks off. Check that each template goes through `parseFieldDefs` in `services/api` (a small script or test) so a template the pipeline can't read is caught.
- **Files:** `apps/web/src/lib/fields/templates.ts`, `apps/web/src/lib/mock/{templates,api}.ts`, `apps/web/src/lib/api/document-types.ts`, `evals/tests/test_types.py` (source path only)
- **Model:** haiku
- **Accept:**
  - [ ] with `VITE_USE_MOCKS=false`, onboarding and `/types/new` list Invoice, Receipt and Contract
  - [ ] `uv run pytest` in `evals/` still passes (the eval type copies match their sources)
  - [ ] typecheck, lint and build green

### [ ] 2. Create types from templates for real
- **Build:** onboarding's types step and the gallery create the chosen types through the real create functions; the new company lands in the Inbox with those types ready. A failed create shows an error with retry and doesn't leave half the types created without saying so.
- **Files:** `apps/web/src/features/onboarding/*`, `apps/web/src/features/document-types/{template-gallery,template-builder}.tsx`, `apps/web/src/lib/real/*` (only if a gap shows up)
- **Model:** sonnet
- **Accept:**
  - [ ] a new real company picks Invoice and Receipt in onboarding, uploads the sample invoice and gets it classified and extracted (`needs_review`)
  - [ ] the same from `/types/new` for an existing company
  - [ ] error state with retry; 375px and 1280px, light and dark

## Backend needs
None new: types and versions are created through the existing RLS-protected tables.

## Open questions
- **Which templates?** Recommended: the three that exist (Invoice, Receipt, Contract); more later from what customers ask for.
- **Branch?** `real-templates-030` from `main`.

## Log
| Date | Slice | Result | Notes / files |
| --- | --- | --- | --- |
