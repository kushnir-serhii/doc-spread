# 001 — Lazy-loaded routes

**Status:** ready · **Depends on:** — · **Route(s):** all

## Goal
Each page loads as its own chunk, so the first load stays small (the build currently warns about a chunk over 500 kB). Required by designer.md → Structure.

## Scope
- In: `lazy` on every page route, a pending UI while a chunk loads, one folder per route under `src/pages/`.
- Out: new screens, data loaders.

## Data
None.

## Slices

### [ ] 1. Pages into route folders
- **Build:** move each page to `src/pages/<route>/` (`landing/`, `auth/`, `not-found/`, `design/`, `placeholder/`). Use `git mv`. No behaviour change.
- **Files:** `src/pages/**`, `src/app/router.tsx`
- **Accept:**
  - [ ] no files left directly in `src/pages/`
  - [ ] typecheck, lint and build green; all current URLs still render

### [ ] 2. Lazy routes + fallback
- **Build:** replace `element` with `lazy: () => import(...).then((m) => ({ Component: m.X }))`. Add a `hydrateFallbackElement` and a slim top progress indicator during navigation (`useNavigation`).
- **Files:** `src/app/router.tsx`, `src/components/layout/route-pending.tsx`
- **Accept:**
  - [ ] build output shows one chunk per page; no chunk-size warning
  - [ ] no "No HydrateFallback" console warning on first load
  - [ ] the pending indicator is announced (`role="status"`) and respects `prefers-reduced-motion`

## Backend needs
None. Hosting note: CloudFront must serve `index.html` for unknown paths.

## Open questions
-

## Log
| Date | Slice | Result | Notes / files |
| --- | --- | --- | --- |
