# 001 — Lazy-loaded routes

**Status:** in-progress · **Depends on:** — · **Route(s):** all

## Goal
Each page loads as its own chunk, so the first load stays small (the build currently warns about a chunk over 500 kB). Required by docs/product.md → Technical frame.

## Scope
- In: `lazy` on every page route, a pending UI while a chunk loads, one folder per route under `src/pages/`.
- Out: new screens, data loaders.

## Data
None.

## Slices

### [x] 1. Pages into route folders
- **Build:** move each page to `src/pages/<route>/` (`landing/`, `auth/`, `not-found/`, `design/`, `placeholder/`). Use `git mv`. No behaviour change.
- **Files:** `src/pages/**`, `src/app/router.tsx`
- **Model:** haiku
- **Accept:**
  - [x] no files left directly in `src/pages/`
  - [x] typecheck, lint and build green; all current URLs still render

### [x] 2. One page per file, default export
- **Build:** split `pages/auth/auth-pages.tsx`: `sign-in-page.tsx`, `sign-up-page.tsx`, `reset-password-page.tsx` in `pages/auth/`; `onboarding-page.tsx` in a new `pages/onboarding/`. `AuthLayout` moves to `components/layout/auth-layout.tsx` (named export, like `AppShell`); the shared `AuthPlaceholder` to `features/auth/auth-placeholder.tsx` (named export). The other pages: `landing-page.tsx`, `not-found-page.tsx`, `design-page.tsx`, `placeholder-page.tsx`. Every page is an arrow function and the file's default export. Update `router.tsx`. No behaviour change.
- **Files:** `src/pages/**`, `src/components/layout/auth-layout.tsx`, `src/features/auth/auth-placeholder.tsx`, `src/app/router.tsx`
- **Accept:**
  - [x] `auth-pages.tsx` is gone; one page per file, every file kebab-case (`<name>-page.tsx`) with a default export of an arrow-function component
  - [x] `pages/onboarding/onboarding-page.tsx` exists; nothing but pages lives in `src/pages/`
  - [x] no `PascalCase` file names under `src/`
  - [x] typecheck, lint and build green; all current URLs still render

### [x] 3. Lazy routes + fallback
- **Build:** replace `element` with `lazy: () => import(...).then((m) => ({ Component: m.default }))`. Add a `hydrateFallbackElement` and a slim top progress indicator during navigation (`useNavigation`). `PlaceholderPage` takes props per route, so those routes need a lazy route that returns an `element` (or another way to pass props); decide when planning the slice.
- **Files:** `src/app/router.tsx`, `src/components/layout/route-pending.tsx`
- **Accept:**
  - [x] build output shows one chunk per page; no chunk-size warning
  - [x] no "No HydrateFallback" console warning on first load
  - [x] the pending indicator is announced (`role="status"`) and respects `prefers-reduced-motion`

### [ ] 4. Sliding pending bar
- **Build:** replace the bar's `animate-pulse` with a sliding indeterminate bar: a new `--animate-route-progress` token plus `@keyframes route-progress` in `src/styles/index.css`. A `w-1/3` segment slides across a clipped track. With reduced motion it's a static full-width bar.
- **Files:** `src/styles/index.css`, `src/components/layout/route-pending.tsx`
- **Model:** haiku
- **Accept:**
  - [ ] the bar slides left to right while a route loads; it uses only token-based utilities
  - [ ] with `prefers-reduced-motion: reduce` it shows a static full-width bar
  - [ ] typecheck, lint and build green

## Backend needs
None. Hosting note: CloudFront must serve `index.html` for unknown paths.

## Open questions
- ~~File names?~~ Resolved 2026-10-22: every file and folder is kebab-case, matching the shadcn CLI (see conventions.md). Our own components are arrow functions with named exports; pages use default exports. The existing components outside `pages/` (`app-shell.tsx`, `header.tsx`, …) already have kebab-case names; they still use `export function` and can switch to arrow functions as each one is touched.
- ~~Main `index` chunk is 464 kB, close to the 500 kB limit. Split vendor code?~~ Resolved 2026-10-22: yes, but later. Add `manualChunks` for vendor code when the main chunk approaches 500 kB again; not now.
- ~~Sliding bar instead of `animate-pulse`?~~ Resolved 2026-10-22: yes, added as slice 4.
- ~~Private helpers (`Section`, `TokenName`) inside `design-page.tsx`?~~ Resolved 2026-10-22: they stay in the file. Small private (non-exported) helpers are allowed; see conventions.md.

## Log
| Date | Slice | Result | Notes / files |
| --- | --- | --- | --- |
| 2026-10-22 | 1 | done (haiku) | `git mv` of 5 pages into `src/pages/{landing,auth,not-found,design,placeholder}/`; imports updated in `src/app/router.tsx`. Typecheck, lint, build green; the 516 kB chunk warning is still there (slice 3 fixes it). |
| 2026-10-22 | 2 | built, then reopened | First built with `PascalCase.tsx` file names (sonnet); the naming rule changed to kebab-case for all files the same day, before any commit, so the files are being renamed. |
| 2026-10-22 | 2 | done (haiku) | Renamed with `git mv` to kebab-case: `pages/auth/{sign-in,sign-up,reset-password}-page.tsx`, `pages/onboarding/onboarding-page.tsx`, `pages/{landing,not-found,design,placeholder}/*-page.tsx`, `components/layout/auth-layout.tsx`, `features/auth/auth-placeholder.tsx`; imports updated. No uppercase file names under `src/`. Typecheck, lint, build green. |
| 2026-10-22 | 3 | done (sonnet) | Every page route is `lazy` (`m.default`); placeholder routes go through a private `placeholder(title, description)` helper whose lazy returns an `element`. A pathless root route renders `<RoutePending />` + `<Outlet />`, with `hydrateFallbackElement: <RoutePending forceVisible />`. New `components/layout/route-pending.tsx` (`role="status"`, sr-only "Loading page…", `motion-safe:animate-pulse`). One chunk per page; main chunk 464 kB, no size warning. HydrateFallback warning ruled out by reading React Router's `lib/hooks.js` (root fallback → `fallbackIndex` 0), not tested in a browser. Typecheck, lint, build green. Files: `src/app/router.tsx`, `src/components/layout/route-pending.tsx`. |
