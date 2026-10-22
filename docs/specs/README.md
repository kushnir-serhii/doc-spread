# Specs

Every task gets one spec file. Every spec is split into **slices**. A slice is the unit of work, review and commit.

## Index

| # | Spec | Status | Depends on |
| --- | --- | --- | --- |
| 001 | [Lazy-loaded routes](001-lazy-routes.md) | ready | — |
| 002 | [Query layer (lib/api)](002-query-layer.md) | draft | 012 |
| 003 | [Landing](003-landing.md) | draft | 001 |
| 004 | [Auth](004-auth.md) | draft | 001 |
| 005 | [Onboarding](005-onboarding.md) | draft | 002, 014 |
| 006 | [Inbox](006-inbox.md) | draft | 002, 012 |
| 007 | [Upload](007-upload.md) | draft | 002, 012 |
| 008 | [Review](008-review.md) | draft | 002, 006, 013 |
| 009 | [Export](009-export.md) | draft | 002, 006 |
| 010 | [Groups](010-groups.md) | draft | 002, 014 |
| 011 | [Settings](011-settings.md) | draft | 002 |
| 012 | [Document model](012-document-model.md) | draft | — |
| 013 | [Document viewer](013-document-viewer.md) | draft | 012 |
| 014 | [Document types (builder)](014-document-types.md) | draft | 002, 012 |
| 015 | [Type from a sample](015-type-from-sample.md) | draft | 013, 014 |
| 016 | [Field actions](016-field-actions.md) | draft | 008, 014 |

Suggested build order: 001 → 012 → 002 → 013 → 014 → 015 → 006 → 007 → 008 → 016 → 009 → 010 → 005 → 011, with 003/004 at any point.

New spec: copy [_template.md](_template.md), take the next number, add a row here.

## Statuses

**Spec:** `draft` → `ready` → `in-progress` → `done`

- `draft`: still being shaped. Not built.
- `ready`: you have approved the scope and slices. It can be built.
- `in-progress`: at least one slice is done.
- `done`: every slice is done and the Definition of Done holds.

**Slices and acceptance criteria:** `[ ]` not done · `[x]` done. A slice is `[x]` only when every one of its criteria is `[x]`. To drop a slice, delete it and say why in the log.

## What a slice is

- A vertical increment you can see or check. Not a layer ("all types", then "all UI").
- It leaves the app building, type-checking and linting green.
- It can be reviewed in about 15 minutes and is about one commit.
- It has its own acceptance criteria that can be verified.

## The loop (how Claude runs a task)

1. **Pick.** Take the first `[ ]` slice of the requested spec. The spec must be `ready` or `in-progress`, and its dependencies must be `done`. Otherwise stop and say why.
2. **Plan.** Re-read the spec and [../conventions.md](../conventions.md). If the slice is unclear or conflicts with the code, stop and ask. Don't guess.
3. **Build.** Change only what the slice needs. Anything else that turns up goes in the spec's **Open questions**.
4. **Verify.** From the repo root:
   ```sh
   pnpm --filter @docspread/web typecheck
   pnpm --filter @docspread/web lint
   pnpm --filter @docspread/web build
   ```
   For UI slices, also check 375px width, light and dark mode, and every state in the slice (loading, empty, error, long values).
5. **Record.** Change the slice and its criteria from `[ ]` to `[x]`, then add one line to the spec's **Log**: date, slice, result, files touched.
6. **Stop and report** in 3–5 lines: what was built, files, open questions. Wait for your OK before the next slice.
7. **Commit** after your OK, one commit per slice: `feat(web): <spec #> slice <n> — <summary>`.

Scope changes go into the spec first, then into the code.

## Commands you can give

- `run 006`: do the next open slice of spec 006.
- `run 006 slice 3`: do that slice only.
- `next`: continue with the next open slice of the current spec.
- `spec <topic>`: draft a new spec from the template for review. No code.
- `status`: summarize the index and the open slices.

## Definition of Done (every spec)

- All slices `[x]`.
- Typecheck, lint and build are green.
- Follows [../conventions.md](../conventions.md).
- Every UI state is designed: loading (skeleton), empty, error with retry, long values.
- WCAG 2.1 AA: labels, visible focus, contrast, 44px touch targets.
- Mock-only data. Whatever the backend must provide is listed under **Backend needs**.
