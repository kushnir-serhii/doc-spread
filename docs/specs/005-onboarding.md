# 005 — Onboarding

**Status:** ready · **Depends on:** 002, 014 · **Route(s):** `/onboarding`

## Goal
A new user sets up the company and their first document type, then lands in the Inbox ready to upload.

## Scope
- In: company name and default currency; "What documents do you process?" with templates to pick (several allowed), "Show us a sample" (links to 015) or "Skip".
- Out: team invites, plan selection, redirecting users who already finished onboarding.

## Data
`Company`, `CURRENCIES`, `useCompany()`, `useUpdateCompany()`, `useTemplates()`, `useCreateDocumentTypes()` (new, slice 2).

**Steps:** one route, `/onboarding`, with the step in the URL: `?step=company` (default) → `?step=types`. Back and reload keep the step. Each step shows "Step N of 2". The card stays narrow on the company step and widens on the types step (the auth layout's `max-w-sm` is too tight for template cards).

## Slices

### [ ] 1. Company step
- **Files:** `src/pages/onboarding/`, `src/features/company/company-form.tsx` (reused by Settings)
- **Accept:**
  - [ ] fields: company name, tax ID (optional, free text), default currency (select from `CURRENCIES`)
  - [ ] the form is prefilled from `useCompany()`: skeleton while it loads, and an error with retry
  - [ ] an empty name blocks submit with a linked message
  - [ ] Continue saves through `useUpdateCompany()` and shows pending; an error shows a `role="alert"` message and the form stays; on success it goes to `?step=types`
  - [ ] works at 375px, in light and dark mode

### [ ] 2. First document types
- **Accept:**
  - [ ] template cards that can be multi-selected (checkbox semantics); the selection is kept in the URL (`?selected=<templateId>,…`)
  - [ ] "From a sample" opens `/types/new?from=sample&returnTo=<onboarding URL>`; after a new type is saved there, it goes back to `returnTo` with `created=<typeId>` instead of `/types/:id`, and onboarding lists that type as already created. `returnTo` is only followed when it is an internal path (starts with a single `/`)
  - [ ] Finish creates the selected types in one request (`createDocumentTypes(inputs)` mock, `useCreateDocumentTypes()` hook, all or nothing), shows pending, then goes to `/inbox`; an error shows a `role="alert"` message with retry
  - [ ] Finish with nothing selected and no type created from a sample shows a linked message ("Pick at least one template, or skip"); with only a sample-created type it goes straight to `/inbox`
  - [ ] each new type takes the template's name; duplicate names are allowed, as in the builder
  - [ ] Skip is allowed; the Inbox empty state then leads to `/types` (it already does)
  - [ ] Back returns to `?step=company`; works at 375px, in light and dark mode

## Backend needs
Company create/update; creating several types in one request (all or nothing); a flag on the company or user that onboarding is finished (to redirect later).

## Open questions
- ~~One page or a stepper?~~ **Decided:** a stepper on one route, step in the URL (see Data).
- **Decided:** the company form is prefilled from `useCompany()`, so Settings (011) can reuse it to edit.
- **Decided:** "From a sample" returns through a `returnTo` param; the created type comes back as `created=<typeId>`.
- **Decided:** Finish uses a new batch mock plus hook (`createDocumentTypes`, `useCreateDocumentTypes`), not a loop over the single create.

## Log
| Date | Slice | Result | Notes / files |
| --- | --- | --- | --- |
| 2026-10-26 | — | ready | questions answered: stepper in the URL, prefill, returnTo for the sample, batch create |
| 2026-10-22 | — | rescoped | accountant email moved to Settings → export recipients; added the first-types step |
