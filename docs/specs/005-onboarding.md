# 005 — Onboarding

**Status:** draft · **Depends on:** 002, 014 · **Route(s):** `/onboarding`

## Goal
A new user sets up the company and their first document type, then lands in the Inbox ready to upload.

## Scope
- In: company name and default currency; "What documents do you process?" with templates to pick (several allowed), "Show us a sample" (links to 015) or "Skip".
- Out: team invites, plan selection.

## Data
`Company`, `CURRENCIES`, `useCompany()`, `useUpdateCompany()`, `useTemplates()`, `useCreateDocumentType()`.

## Slices

### [ ] 1. Company step
- **Files:** `src/pages/onboarding/`, `src/features/company/CompanyForm.tsx` (reused by Settings)
- **Accept:**
  - [ ] fields: company name, tax ID (optional), default currency (select from `CURRENCIES`)
  - [ ] an empty name blocks submit with a linked message

### [ ] 2. First document types
- **Accept:**
  - [ ] template cards that can be multi-selected (checkbox semantics); "From a sample" goes to 015 and comes back afterwards
  - [ ] Finish creates the selected types, shows pending, then goes to `/inbox`; an error shows a `role="alert"` message with retry
  - [ ] Skip is allowed; the Inbox empty state then leads to `/types`

## Backend needs
Company create/update; creating several types in one request.

## Open questions
- One page or a stepper?

## Log
| Date | Slice | Result | Notes / files |
| --- | --- | --- | --- |
| 2026-10-22 | — | rescoped | accountant email moved to Settings → export recipients; added the first-types step |
