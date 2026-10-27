# 004 — Auth

**Status:** done · **Depends on:** 001 · **Route(s):** `/sign-in`, `/sign-up`, `/reset-password`

## Goal
A user coming from the landing page can sign in (→ `/inbox`), create an account (→ `/onboarding`) or request a password reset, against mocks shaped like the future backend, so the forms, validation, pending and error states are final before a provider is wired in.

## Scope
- In: three forms in `AuthLayout`, client-side validation, pending and error states, redirects on success (sign-in → `/inbox`, sign-up → `/onboarding`), provider-neutral error codes.
- Out: real auth provider, OAuth, session persistence, route guards and `returnTo`, "remember me", the "set a new password" page behind the emailed link, Terms/Privacy.

## Data
Mock `signIn`, `signUp`, `requestPasswordReset` in `src/lib/mock/api.ts` plus one hook each in `src/lib/api/auth.ts` (mutations; exported from `src/lib/api/index.ts`). Each slice adds its own function and hook.

- `AUTH_ERROR_CODES = ['invalid_credentials', 'email_taken', 'rate_limited'] as const` → `AuthErrorCode`, and an `AuthError extends Error` with a `code: AuthErrorCode`, in `src/lib/mock/types.ts`. No parameter properties (`erasableSyntaxOnly`).
- Deterministic mock rules (documented in the mock's comment), like upload's "fail" in a file name:
  - any email containing `limit` (case-insensitive) → `rate_limited`, on all three forms;
  - sign-in: any email works; the password `wrong-password` → `invalid_credentials`;
  - sign-up: a seeded team email (e.g. `alex@northwind-studio.example`) or an email signed up earlier in this session → `email_taken`;
  - reset: always resolves the same way whether or not the account exists.
- Mock functions use the shared `delay()`.

## Shared UI (`src/features/auth/`)
- `PasswordInput`: an `Input` plus a show/hide icon button (`aria-label` "Show password" / "Hide password", `aria-pressed`, 44px touch target, `type="button"`).
- Forms follow `CompanyForm`: `noValidate`, ids from `useId`, `<Label htmlFor>`, validation on submit and live after the first submit, focus the first invalid field, inputs `min-h-touch md:min-h-9`, the submit button shows a spinner + "…ing" text and is disabled while pending, inputs disabled while pending.
- Field errors: `aria-invalid` + `aria-describedby` to the message. Form-level errors: `role="alert"` above the submit button. An unexpected (non-`AuthError`) failure shows "Something went wrong. Try again." and the user can resubmit.
- Each page: one `h1`, a short subline, links below the form (44px touch targets on mobile).

## Slices

### [x] 1. Audit the existing pages
- **Build:** compare `auth-pages.tsx` with this spec. Record the gaps. No code.
- **Accept:**
  - [x] gap list recorded in the log; slices below adjusted

### [x] 2. Sign in
- **Model:** sonnet (designer)
- **Files:** `src/pages/auth/sign-in-page.tsx`, `src/features/auth/` (`sign-in-form.tsx`, `password-input.tsx`), `src/lib/mock/types.ts`, `src/lib/mock/api.ts`, `src/lib/api/auth.ts`, `src/lib/api/index.ts`
- **Build:** h1 "Sign in", subline "Welcome back to DocSpread." Fields: Email (`type="email"`, `autoComplete="email"`), Password (`autoComplete="current-password"`). Submit "Sign in" ("Signing in…"). Links: "Forgot password?" → `/reset-password`, "Don't have an account? Create one" → `/sign-up`. Validation: "Enter your email." / "Enter a valid email address." / "Enter your password." (no length rule on sign-in). The "Continue to app" link goes away.
- **Accept:**
  - [x] email and password with labels, `autoComplete`, show/hide password button with an `aria-label`
  - [x] the submit button shows pending and is disabled; a wrong password (`wrong-password`) shows a `role="alert"` error "Email or password is incorrect." and keeps both values
  - [x] `rate_limited` shows "Too many attempts. Wait a few minutes and try again." as `role="alert"`
  - [x] success navigates to `/inbox`

### [x] 3. Sign up
- **Model:** sonnet (designer)
- **Files:** `src/pages/auth/sign-up-page.tsx`, `src/features/auth/sign-up-form.tsx`, `src/lib/mock/api.ts`, `src/lib/api/auth.ts`
- **Build:** h1 "Create your account", subline "Start turning documents into spreadsheets." Fields: Full name (`autoComplete="name"`), Email (`autoComplete="email"`), Password (`PasswordInput`, `autoComplete="new-password"`, hint "At least 8 characters." always visible). No confirm field, no Terms checkbox. Submit "Create account" ("Creating account…"). Link: "Already have an account? Sign in" → `/sign-in`. Validation: "Enter your name." / email messages as in sign-in / "Use at least 8 characters."
- **Accept:**
  - [x] field-level validation messages are linked with `aria-describedby` (the password's hint and its error both)
  - [x] `email_taken` shows "An account with this email already exists." with a "Sign in instead" link to `/sign-in`, as `role="alert"`; `rate_limited` as in sign-in
  - [x] success navigates to `/onboarding`

### [x] 4. Reset password
- **Model:** sonnet (designer)
- **Files:** `src/pages/auth/reset-password-page.tsx`, `src/features/auth/reset-password-form.tsx`, `src/lib/mock/api.ts`, `src/lib/api/auth.ts`; delete `src/features/auth/auth-placeholder.tsx`
- **Build:** h1 "Reset your password", subline "Enter the email you signed up with. We'll send you a link to set a new password." Field: Email. Submit "Send reset link" ("Sending…"). Link: "Back to sign in" → `/sign-in`. State as a discriminated union (`{ step: 'form'; email: string } | { step: 'sent'; email: string }`; the form step keeps the email so "Use a different email" prefills it).
- **Accept:**
  - [x] after submit: confirmation state ("check your email") that doesn't reveal whether the account exists: h1 "Check your email", "If an account exists for {email}, we've sent a link to reset your password. Check your inbox and spam folder." (long emails wrap), announced via `role="status"`; actions "Back to sign in" and "Use a different email" (back to the form, email kept)
  - [x] `rate_limited` shows its `role="alert"` error on the form
  - [x] `AuthPlaceholder` is deleted and nothing imports it

## Backend needs
Endpoints for sign-in, sign-up (name, email, password) and reset request; error codes (invalid credentials, email taken, rate limited), the same response for reset whether or not the account exists; password policy (min length) served or documented; session format; the "set a new password" endpoint and page behind the emailed link.

## Open questions
- Which auth provider (Cognito, Supabase, other)? It shapes the error codes.
  - **Decided:** not yet chosen (Supabase planned per product.md); the UI maps provider-neutral codes `invalid_credentials`, `email_taken`, `rate_limited`, translated in the API layer later.
- How are error states reached in the mocks? **Decided:** magic values (see **Data**).
- Sign-up fields? **Decided:** full name, email, password (≥ 8, show/hide), no confirm, no Terms checkbox; company is asked in onboarding.

## Log
| Date | Slice | Result | Notes / files |
| --- | --- | --- | --- |
| 2026-10-27 | — | ready | questions answered; draft → ready |
| 2026-10-27 | 1 | done | gaps: all three pages render `AuthPlaceholder` ("Form coming…" + "Continue to app" → `/inbox`); no forms, validation, pending or error states; no mock `signIn`/`signUp`/`requestPasswordReset`, no `lib/api/auth.ts`, no `AuthError`. Already fine: `AuthLayout` card (logo, theme toggle), routes in `router.tsx`, landing CTAs and "Sign out" link to `/sign-in`/`/sign-up`. Slices 2–4 detailed with copy, mock rules and shared `PasswordInput` |
| 2026-10-27 | 2 | done | sign-in form (validation, pending, `role="alert"` errors for `invalid_credentials`/`rate_limited`, generic fallback), → `/inbox`; `AuthError` + `AUTH_ERROR_CODES`, mock `signIn`, `useSignIn`, shared `PasswordInput`. `lib/mock/types.ts`, `lib/mock/api.ts`, `lib/api/auth.ts`, `lib/api/index.ts`, `features/auth/password-input.tsx`, `sign-in-form.tsx`, `pages/auth/sign-in-page.tsx` |
| 2026-10-27 | 3 | done | sign-up form (name, email, password with hint; `aria-describedby` to hint + errors), `email_taken` alert with "Sign in instead" link, → `/onboarding`; mock `signUp` (team emails + `db.signedUpEmails`), `useSignUp`; email validation and error messages shared with sign-in. `features/auth/sign-up-form.tsx`, `auth-validation.ts`, `auth-error-message.ts`, `sign-in-form.tsx`, `lib/mock/api.ts`, `lib/api/auth.ts`, `pages/auth/sign-up-page.tsx` |
| 2026-10-27 | 4 | done | reset form → "Check your email" (`role="status"`, long email wraps, heading focused), "Use a different email" keeps the email; `rate_limited` alert; mock `requestPasswordReset`, `useRequestPasswordReset`; `AuthPlaceholder` deleted. `features/auth/reset-password.tsx`, `reset-password-form.tsx`, `reset-password-sent.tsx`, `pages/auth/reset-password-page.tsx`, `lib/mock/api.ts`, `lib/api/auth.ts` |
| 2026-10-27 | — | done | UI check `SPEC=004 ROUTES=sign-in,sign-up,reset-password` passes (12/12), screenshots reviewed; error, pending, email-taken, rate-limit and sent states (long email at 375px, no horizontal scroll) checked with a throwaway Playwright run; spec done |
