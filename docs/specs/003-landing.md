# 003 — Landing

**Status:** done · **Depends on:** 001 · **Route(s):** `/`

## Goal
A visitor understands what DocSpread does in a few seconds and signs up.

## Scope
- In: hero (any document → a spreadsheet, not just invoices) with a decorative illustration, "how it works" in 3 steps (describe or show your document → upload → review and export), CTA to `/sign-up`, link to `/sign-in`, footer.
- Out: pricing page, blog, marketing analytics, Privacy/Terms pages (no footer links to them until they exist), a link into the app (`/inbox`) from the landing.

## Data
None (static).

## Slices

### [x] 1. Audit the existing page
- **Build:** compare `landing-page.tsx` with this spec and the conventions. List the gaps in the log. No code.
- **Accept:**
  - [x] gap list recorded; slices below adjusted

### [x] 2. Hero + CTA
- **Files:** `src/pages/landing/landing-page.tsx`, `src/features/landing/` (hero, illustration)
- **Build:** replace the placeholder hero. Header unchanged (logo, theme toggle, Sign in).
  - H1: "Turn any document into a spreadsheet."
  - Subline: "Tell DocSpread what to collect, upload your files, check what AI read, and export clean rows."
  - A row of niche examples (plain text chips, not links): Invoices · Receipts · Contracts · HR forms · Delivery notes · Your own type.
  - CTAs: "Get started" → `/sign-up` (primary, last in the stack at 375px), "I have an account" → `/sign-in` (outline). The "Open the app" → `/inbox` link is removed.
  - Illustration: token-only, `aria-hidden`; a document card → arrow → a few table rows (no real amounts). Beside the text from `md`/`lg`, stacked under it at 375px.
- **Accept:**
  - [x] one `h1`; primary CTA to `/sign-up`; secondary to `/sign-in`; no link to `/inbox`
  - [x] copy is horizontal (several niches), as above
  - [x] illustration is decorative (`aria-hidden`), uses tokens only
  - [x] works at 375px, light and dark

### [x] 3. How it works (3 steps) + footer
- **Files:** `src/pages/landing/landing-page.tsx`, `src/features/landing/`
- **Build:**
  - Section heading (`h2`) "How it works" and three steps:
    1. **Describe your document** — start from a template, build from scratch, or show a sample and point at the values.
    2. **Upload your files** — each one is sorted into its type automatically.
    3. **Review and export** — check the values side by side with the document, approve, and export CSV or XLSX.
  - Footer: logo, "© {current year} DocSpread", links "Sign in" → `/sign-in` and "Create account" → `/sign-up`.
- **Accept:**
  - [x] the steps are an ordered list semantically (`ol`)
  - [x] icons are decorative (`aria-hidden`)
  - [x] footer in a `footer` landmark; year computed, not hard-coded; links are 44px touch targets
  - [x] works at 375px, light and dark

## Backend needs
None.

## Open questions
- Final product copy and value proposition? The product is horizontal: lead with examples from several niches (invoices, receipts, contracts, HR forms).
  - **Decided:** the copy in slices 2 and 3 (approved 2026-10-27).
- Hero visual? **Decided:** a simple decorative illustration (document → rows).
- CTAs and footer? **Decided:** "Get started" → `/sign-up`, "I have an account" → `/sign-in`, no `/inbox` link; minimal footer without Privacy/Terms.

## Log
| Date | Slice | Result | Notes / files |
| --- | --- | --- | --- |
| 2026-10-22 | — | rescoped | positioning is horizontal: any document type |
| 2026-10-27 | — | ready | questions answered; draft → ready |
| 2026-10-27 | 1 | done | gaps in `landing-page.tsx`: invoice-only copy ("Supplier invoices…"); secondary CTA "Open the app" → `/inbox` instead of `/sign-in`; no "how it works"; no footer; no visual; placeholder doc comment. CTAs and touch targets, header (logo, theme toggle, Sign in) and the single `h1` already fine. Slices 2–3 adjusted with the approved copy |
| 2026-10-27 | 2 | done | hero with horizontal copy, niche chips, CTAs (`/sign-in`, `/sign-up`), decorative illustration; `/inbox` link removed. `pages/landing/landing-page.tsx`, `features/landing/hero.tsx`, `niche-list.tsx`, `hero-illustration.tsx` |
| 2026-10-27 | 3 | done | "How it works" section (`ol`, decorative icons, h2/h3) and footer (logo, computed year, Sign in / Create account, 44px). `features/landing/how-it-works.tsx`, `landing-footer.tsx`, `pages/landing/landing-page.tsx`. UI check `SPEC=003 ROUTES=root` passes, screenshots reviewed; spec done |
