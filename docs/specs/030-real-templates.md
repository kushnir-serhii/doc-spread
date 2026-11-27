# 030 — Templates in the real app: a new company starts with ready types

**Status:** done · **Depends on:** 023 · **Route(s):** `/onboarding?step=types`, `/types/new?from=template`, `/sign-up`

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

### [x] 1. Templates in both modes
- **Build:** move the templates out of `lib/mock`, update imports (`mock/api.ts`, `api/document-types.ts`, the evals drift test's source path), and make `useTemplates` return them with mocks off. Check that each template goes through `parseFieldDefs` in `services/api` (a small script or test) so a template the pipeline can't read is caught.
- **Files:** `apps/web/src/lib/fields/templates.ts`, `apps/web/src/lib/mock/{templates,api}.ts`, `apps/web/src/lib/api/document-types.ts`, `evals/tests/test_types.py` (source path only)
- **Model:** haiku
- **Accept:**
  - [x] with `VITE_USE_MOCKS=false`, onboarding and `/types/new` list Invoice, Receipt and Contract
  - [x] `uv run pytest` in `evals/` still passes (the eval type copies match their sources)
  - [x] typecheck, lint and build green

### [x] 2. Onboarding's types step in the real app
- **Build:** with mocks off, `/onboarding?step=types` shows the real types step (the company step and a bare `/onboarding` keep the "Not available yet" page until 033: sign-up already created the company). Real sign-up sends the new user to `/onboarding?step=types` instead of `/types`. The "show us a sample" link in the types step is hidden with mocks off (type from a sample has no backend yet). Creating the chosen types already goes through the real, all-or-nothing `createDocumentTypes`; the user lands in the Inbox with those types ready. The gallery in `/types/new?from=template` works the same way.
- **Files:** `apps/web/src/pages/onboarding/onboarding-page.tsx`, `apps/web/src/features/onboarding/types-step.tsx`, `apps/web/src/features/auth/sign-up-form.tsx`, `apps/web/src/features/document-types/{template-gallery,template-builder}.tsx` (only if a gap shows up)
- **Model:** sonnet
- **Accept:**
  - [x] a new real company signs up, lands on the types step, picks Invoice and Receipt and lands in the Inbox with both types (checked locally with `vercel dev` and mocks off)
  - [x] uploading the sample invoice in that company gets it to `needs_review` (checked 2026-11-27, once the Anthropic usage limit was lifted)
  - [x] the same from `/types/new` for an existing company
  - [x] error state with retry; 375px and 1280px, light and dark

## Backend needs
None new: types and versions are created through the existing RLS-protected tables.

## Open questions
- **Which templates?** **Decided (2026-11-26):** the three that exist (Invoice, Receipt, Contract).
- **Where does a new real customer go after sign-up?** **Decided:** `/onboarding?step=types`; the company step stays demo-only until 033 (editing the company).
- **The "show us a sample" link with mocks off?** **Decided:** hidden until the AI builder has a backend.
- **Branch?** **Decided:** `real-templates-030` from `main` (`--no-track`); its first commit also carries the `.claude/settings.json` deny rules (no push to `main`, no branch tracking `origin/*`).

## Log
| Date | Slice | Result | Notes / files |
| --- | --- | --- | --- |
| 2026-11-26 | 1 | done: templates moved to `lib/fields/templates.ts` (product data, not mock); `useTemplates` returns them with mocks off too; `/types/new?from=template` and the New type menu no longer treat templates as an AI feature (`new-type-page.tsx`, `new-type-options.ts`: only the sample routes stay gated). `pnpm --filter @docspread/api check-templates`: Invoice 11, Receipt 7, Contract 11 fields parse with `parseFieldDefs`. 90 pytest tests (eval drift test path updated). Typecheck, lint, build green. | `apps/web/src/lib/fields/templates.ts`, `apps/web/src/lib/mock/{api,document-types-seed,index}.ts`, `apps/web/src/lib/api/document-types.ts`, `apps/web/src/features/document-types/{template-card,type-draft,new-type-options}.ts(x)`, `apps/web/src/features/onboarding/selectable-template-card.tsx`, `apps/web/src/pages/types/new-type-page.tsx`, `evals/tests/test_types.py`, `services/api/{package.json,scripts/check-templates.ts}` |
| 2026-11-26 | 2 (all but the upload check) | with mocks off: sign-up → `/onboarding?step=types`; bare `/onboarding` keeps "Not available yet" with a link to the types step; the sample link and Back are hidden, and so is the "Step 2 of 2" counter (no step 1 until 033). End-to-end on `vercel dev` (Playwright, no uploads, no AI calls): a new company picked Invoice and Receipt, landed on `/inbox`, `/types` listed both; `/types/new?from=template` saved Contract; no console errors, no horizontal scroll at 375px. The three test companies and their auth users were deleted from `docspread-dev` afterwards. Error with retry: the existing all-or-nothing create and its alert, reviewed in code. Open: the upload-to-`needs_review` check waits for the Anthropic usage limit (2026-12-01 or sooner). | `apps/web/src/pages/onboarding/onboarding-page.tsx`, `apps/web/src/features/onboarding/{types-step,onboarding-card}.tsx`, `apps/web/src/features/auth/sign-up-form.tsx` |
| 2026-11-27 | 2 (upload check) | done: on `vercel dev` with mocks off against `docspread-dev` (Playwright script, not committed): a new company signed up, landed on the types step, picked Invoice and Receipt, landed on `/inbox`; the sample invoice uploaded from `/upload` was classified as Invoice and reached `needs_review` in 73 s (11 values, confidence High 97% in the Inbox), no console errors. The test companies and users were deleted afterwards; one test upload (`sample-invoice.pdf`, 6 KB) of a deleted company is still in the `documents` bucket (the cleanup that would remove it was not allowed in this session). Spec done. | no code changes |
