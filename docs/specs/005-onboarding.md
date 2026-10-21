# 005 — Onboarding

**Status:** draft · **Depends on:** 002 · **Route(s):** `/onboarding`

## Goal
A new user sets the company name, accountant email and default currency, and lands in the Inbox.

## Scope
- In: one form (or 3 short steps), validation, save through `useUpdateCompany()`.
- Out: team invites, plan selection.

## Data
`Company`, `CURRENCIES`, `useCompany()`, `useUpdateCompany()`.

## Slices

### [ ] 1. Form + validation
- **Files:** `src/pages/onboarding/`, `src/features/company/company-form.tsx` (reused by Settings)
- **Accept:**
  - [ ] fields: company name, tax ID (NIP), accountant email, default currency (select from `CURRENCIES`)
  - [ ] invalid email or empty name blocks submit with linked messages

### [ ] 2. Save + redirect
- **Accept:**
  - [ ] pending state on submit; on success go to `/inbox`; on error a `role="alert"` message with retry

## Backend needs
Company create/update; NIP format validation on the server.

## Open questions
- One page or a stepper?

## Log
| Date | Slice | Result | Notes / files |
| --- | --- | --- | --- |
