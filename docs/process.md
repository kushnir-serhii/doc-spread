# Development process

How work moves from a spec to code. What to build and in which order lives in [roadmap.md](roadmap.md); the rules the code is checked against live in [conventions.md](conventions.md).

Every task gets one spec file in [specs/](specs/). Every spec is split into **slices**. A slice is the unit of work, review and commit.

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
- It may name a model (`**Model:** haiku`); see **Models and delegation**.

## Models and delegation

- The main session (Opus) orchestrates: it picks and plans slices, delegates the implementation to subagents, reviews their diffs against the spec and the conventions, runs the verification, and records the result. It doesn't write slice code itself unless a fix is trivial.
- Implementation goes to subagents on **Sonnet**: components, hooks, mocks, slices in general. Use the `designer` agent type for slices that are mostly UI.
- The simplest mechanical work goes to **Haiku**: moving or renaming files, copy changes, adding a shadcn primitive.
- A slice's `**Model:**` line overrides this choice.
- Subagents can run in parallel when their slices are independent: their dependencies are `done` and they don't touch the same files. Each parallel agent works in its own worktree (`isolation: "worktree"`). The approval loop still holds: the batch is reported together.

## The loop (`/run-implement`, `/run-i`)

Arguments: none (next slice from the plan) · `012` (next open slice of that spec) · `012 slice 3` (exactly that slice) · `parallel` (also the other independent specs of the current wave).

1. **Pick.** Read [roadmap.md](roadmap.md). Walk the **Plan** top to bottom and take the first spec that isn't `done` (or the one from the arguments), then its first `[ ]` slice. Stop without writing code, and say why, if:
   - the spec is `draft`: name it and ask for a review and `ready`;
   - a dependency in **Status** isn't `done`: name it;
   - every spec in the plan is `done`.
2. **Plan.** Re-read the spec, [conventions.md](conventions.md) and the files the slice touches. If the slice is unclear or conflicts with the code, stop and ask. Don't guess. Choose the model (see above).
3. **Delegate.** Start a subagent with a self-contained prompt:
   - the spec path, the slice number and its full text (Build, Files, Accept), plus facts from the plan it would otherwise rediscover;
   - follow `docs/conventions.md` and `CLAUDE.md`; change only what this slice needs, and report anything else as an open question;
   - don't commit, create branches, or touch the spec's checkboxes and log;
   - run typecheck, lint and build and fix failures; report the files changed, how each criterion was met, and open questions.
4. **Verify.** Don't trust the report. Read the diff and check it against every criterion and the conventions. From the repo root:
   ```sh
   pnpm --filter @docspread/web typecheck
   pnpm --filter @docspread/web lint
   pnpm --filter @docspread/web build
   ```
   For UI slices, also check 375px width, light and dark mode, and every state in the slice (loading, empty, error, long values). Send problems back to the agent with specifics; after two rounds, report what still fails.
5. **Record.** In the spec: mark the criteria and the slice `[x]`, add one **Log** row (date, slice, result, files touched), add new **Open questions**. Update the status in the spec header and in [roadmap.md](roadmap.md): `ready` → `in-progress` after the first slice, `in-progress` → `done` when all slices are `[x]` and the Definition of Done holds.
6. **Report and stop** in 3–5 lines: what was built, files, open questions, and what comes next in the plan. End with a suggested commit message: `feat(web): <spec #> slice <n> — <summary>`. Wait for your OK.
7. **Commit.** You make the commits and branches yourself. Claude never commits or creates branches.

Scope changes go into the spec first, then into the code.

## Other commands you can give

- `spec <topic>`: draft a new spec from the template for review. No code.
- `status`: summarize [roadmap.md](roadmap.md) and the open slices.

## Definition of Done (every spec)

- All slices `[x]`.
- Typecheck, lint and build are green.
- Follows [conventions.md](conventions.md).
- Every UI state is designed: loading (skeleton), empty, error with retry, long values.
- WCAG 2.1 AA: labels, visible focus, contrast, 44px touch targets.
- Mock-only data. Whatever the backend must provide is listed under **Backend needs**.
