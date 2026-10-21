# 003 — Landing

**Status:** draft · **Depends on:** 001 · **Route(s):** `/`

## Goal
A visitor understands what DocSpread does in a few seconds and signs up.

## Scope
- In: hero, "how it works" in 3 steps, CTA to `/sign-up`, link to `/sign-in`, footer.
- Out: pricing page, blog, marketing analytics.

## Data
None (static).

## Slices

### [ ] 1. Audit the existing page
- **Build:** compare `landing-page.tsx` with this spec and the conventions. List the gaps in the log. No code.
- **Accept:**
  - [ ] gap list recorded; slices below adjusted

### [ ] 2. Hero + CTA
- **Files:** `src/pages/landing/`
- **Accept:**
  - [ ] one `h1`; primary CTA to `/sign-up`; secondary to `/sign-in`
  - [ ] works at 375px, light and dark

### [ ] 3. How it works (3 steps) + footer
- **Accept:**
  - [ ] the steps are an ordered list semantically (`ol`)
  - [ ] icons are decorative (`aria-hidden`)

## Backend needs
None.

## Open questions
- Final product copy and value proposition?

## Log
| Date | Slice | Result | Notes / files |
| --- | --- | --- | --- |
