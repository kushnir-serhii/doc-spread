# 004 — Auth

**Status:** draft · **Depends on:** 001 · **Route(s):** `/sign-in`, `/sign-up`, `/reset-password`

## Goal
A user can sign in, create an account and request a password reset, against mocks.

## Scope
- In: three forms in `AuthLayout`, client-side validation, pending and error states, redirects on success (sign-in → `/inbox`, sign-up → `/onboarding`).
- Out: real auth provider, OAuth, session persistence.

## Data
Add mock `signIn`, `signUp`, `requestPasswordReset` to `src/lib/mock/api.ts` plus hooks in `src/lib/api/auth.ts`.

## Slices

### [ ] 1. Audit the existing pages
- **Build:** compare `auth-pages.tsx` with this spec. Record the gaps. No code.

### [ ] 2. Sign in
- **Files:** `src/pages/auth/sign-in-page.tsx`, `src/features/auth/`
- **Accept:**
  - [ ] email and password with labels, `autoComplete`, show/hide password button with an `aria-label`
  - [ ] the submit button shows pending and is disabled; a wrong password shows a `role="alert"` error
  - [ ] success navigates to `/inbox`

### [ ] 3. Sign up
- **Accept:**
  - [ ] field-level validation messages are linked with `aria-describedby`
  - [ ] success navigates to `/onboarding`

### [ ] 4. Reset password
- **Accept:**
  - [ ] after submit: confirmation state ("check your email") that doesn't reveal whether the account exists

## Backend needs
Endpoints for sign-in, sign-up and reset, error codes (invalid credentials, email taken, rate limited), session format.

## Open questions
- Which auth provider (Cognito, Supabase, other)? It shapes the error codes.

## Log
| Date | Slice | Result | Notes / files |
| --- | --- | --- | --- |
