# 005 — Onboarding

**Status:** done · **Depends on:** 002, 014 · **Route(s):** `/onboarding`

## Goal
A new user sets up the company and their first document type, then lands in the Inbox ready to upload.

## Scope
- In: company name and default currency; "What documents do you process?" with templates to pick (several allowed), "Show us a sample" (links to 015) or "Skip".
- Out: team invites, plan selection, redirecting users who already finished onboarding.

## Data
`Company`, `CURRENCIES`, `useCompany()`, `useUpdateCompany()`, `useTemplates()`, `useCreateDocumentTypes()` (new, slice 2).

**Steps:** one route, `/onboarding`, with the step in the URL: `?step=company` (default) → `?step=types`. Back and reload keep the step. Each step shows "Step N of 2". The card stays narrow on the company step and widens on the types step (the auth layout's `max-w-sm` is too tight for template cards).

## Slices

### [x] 1. Company step
- **Files:** `src/pages/onboarding/`, `src/features/company/company-form.tsx` (reused by Settings)
- **Accept:**
  - [x] fields: company name, tax ID (optional, free text), default currency (select from `CURRENCIES`)
  - [x] the form is prefilled from `useCompany()`: skeleton while it loads, and an error with retry
  - [x] an empty name blocks submit with a linked message
  - [x] Continue saves through `useUpdateCompany()` and shows pending; an error shows a `role="alert"` message and the form stays; on success it goes to `?step=types`
  - [x] works at 375px, in light and dark mode

### [x] 2. First document types
- **Accept:**
  - [x] template cards that can be multi-selected (checkbox semantics); the selection is kept in the URL (`?selected=<templateId>,…`)
  - [x] "From a sample" opens `/types/new?from=sample&returnTo=<onboarding URL>`; after a new type is saved there, it goes back to `returnTo` with `created=<typeId>` instead of `/types/:id`, and onboarding lists that type as already created. `returnTo` is only followed when it is an internal path (starts with a single `/`)
  - [x] Finish creates the selected types in one request (`createDocumentTypes(inputs)` mock, `useCreateDocumentTypes()` hook, all or nothing), shows pending, then goes to `/inbox`; an error shows a `role="alert"` message with retry
  - [x] Finish with nothing selected and no type created from a sample shows a linked message ("Pick at least one template, or skip"); with only a sample-created type it goes straight to `/inbox`
  - [x] each new type takes the template's name; duplicate names are allowed, as in the builder
  - [x] Skip is allowed; the Inbox empty state then leads to `/types` (it already does)
  - [x] Back returns to `?step=company`; works at 375px, in light and dark mode

## Backend needs
Company create/update; creating several types in one request (all or nothing); a flag on the company or user that onboarding is finished (to redirect later).

## Open questions
- ~~One page or a stepper?~~ **Decided:** a stepper on one route, step in the URL (see Data).
- **Decided:** the company form is prefilled from `useCompany()`, so Settings (011) can reuse it to edit.
- **Decided:** "From a sample" returns through a `returnTo` param; the created type comes back as `created=<typeId>`.
- **Decided:** Finish uses a new batch mock plus hook (`createDocumentTypes`, `useCreateDocumentTypes`), not a loop over the single create.

- Selected ids that no longer match a template are ignored on Finish.
- `useTypeSave` reads `returnTo` itself; if another screen ever needs a return trip after creating a type, it gets it for free (only `/types/new` passes one today).

## Log
| Date | Slice | Result | Notes / files |
| --- | --- | --- | --- |
| 2026-10-26 | 2 | done | selectable template cards (real checkbox, `?selected=`), `createDocumentTypes` mock + `useCreateDocumentTypes` (all or nothing), sample round trip via `returnTo` → `created=` (`lib/return-to.ts`, `use-type-save.ts`, sample builder back link); checked in the browser at 375px, light/dark, sample round trip, Finish → new types · `features/onboarding/{types-step,template-picker,selectable-template-card,created-types-list}.tsx`, `lib/mock/api.ts`, `lib/api/document-types.ts` |
| 2026-10-26 | 1 | done | company form (native currency select, prefilled, linked name error); onboarding card + step in URL; AuthLayout lets a route own its card via `handle.ownsCard` · `features/company/company-form.tsx`, `features/onboarding/{company-step,onboarding-card,types-step}.tsx`, `pages/onboarding/onboarding-page.tsx`, `components/layout/auth-layout.tsx`, `app/router.tsx` |
| 2026-10-26 | — | ready | questions answered: stepper in the URL, prefill, returnTo for the sample, batch create |
| 2026-10-22 | — | rescoped | accountant email moved to Settings → export recipients; added the first-types step |
