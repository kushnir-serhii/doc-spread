# Roadmap

The single source of truth for what is done, what is next, and in which order. `/run-implement` (`/run-i`) reads this file. The process behind it is in [process.md](process.md).

## Status

| # | Spec | Status | Depends on |
| --- | --- | --- | --- |
| 001 | [Lazy-loaded routes](specs/001-lazy-routes.md) | done | — |
| 002 | [Query layer (lib/api)](specs/002-query-layer.md) | done | 012 |
| 003 | [Landing](specs/003-landing.md) | done | 001 |
| 004 | [Auth](specs/004-auth.md) | done | 001 |
| 005 | [Onboarding](specs/005-onboarding.md) | done | 002, 014 |
| 006 | [Inbox](specs/006-inbox.md) | done | 002, 012 |
| 007 | [Upload](specs/007-upload.md) | done | 002, 012 |
| 008 | [Review](specs/008-review.md) | done | 002, 006, 013 |
| 009 | [Export](specs/009-export.md) | done | 002, 006 |
| 010 | [Groups](specs/010-groups.md) | done | 002, 014 |
| 011 | [Settings](specs/011-settings.md) | done | 002 |
| 012 | [Document model](specs/012-document-model.md) | done | — |
| 013 | [Document viewer](specs/013-document-viewer.md) | done | 002, 012 |
| 014 | [Document types (builder)](specs/014-document-types.md) | done | 002, 012 |
| 015 | [Type from a sample](specs/015-type-from-sample.md) | done | 013, 014 |
| 016 | [Field actions](specs/016-field-actions.md) | done | 008, 014 |
| 017 | [Row actions (table rows)](specs/017-row-actions.md) | done | 016 |
| 018 | [Export: table column mapping](specs/018-export-table-columns.md) | done | 009 |
| 019 | [Mock data without country defaults](specs/019-mock-without-country-defaults.md) | done | — |
| 020 | [Cloud setup: AWS, AI, database and env](specs/020-cloud-setup.md) | done | 012 |
| 021 | [Architecture page: UML diagrams](specs/021-architecture-diagrams.md) | done | — |
| 022 | [Off AWS: Vercel and Supabase only](specs/022-vercel-supabase.md) | done | 020 |
| 023 | [First real flow](specs/023-first-real-flow.md) | done | 022 |
| 024 | [UML diagrams: system, user and document flows (dev only)](specs/024-uml-diagrams.md) | done | 021 |
| 025 | [Golden dataset: invoices and receipts with known answers](specs/025-golden-dataset.md) | done | 023 |
| 026 | [Extraction evals: runner, scoring and analysis](specs/026-extraction-evals.md) | in-progress | 025 |
| 027 | [CI eval gate](specs/027-eval-ci-gate.md) | postponed | 026 |
| 028 | [Eval dashboard (optional, FastAPI)](specs/028-eval-dashboard.md) | postponed | 026 |
| 029 | [Cheaper extraction and an accuracy choice per type](specs/029-cheaper-extraction.md) | postponed | 026 |
| 030 | [Templates in the real app](specs/030-real-templates.md) | draft | 023 |
| 031 | [Usage limits: no company can run up the AI bill](specs/031-usage-limits.md) | draft | 023 |

Statuses: `draft` → `ready` → `in-progress` → `done`, or `postponed` (meaning in [process.md](process.md#statuses)). The status here and in the spec's header must match.

## Plan

Read top to bottom; the next spec is the first one that isn't `done`. **Goal of the current stretch (decided 2026-11-26): a production version real customers can use, on Haiku, with the AI bill protected.** Specs in **Postponed** are not in this table and are never picked. Specs in one wave don't depend on each other and can run in parallel; otherwise they are built in the listed order.

| Wave | Specs (in order) |
| --- | --- |
| 1 | 001, 012 |
| 2 | 002 |
| 3 | 013, 014 |
| 4 | 015, 006, 007 |
| 5 | 008 |
| 6 | 016, 009, 019, 010 |
| 7 | 005, 011, 003, 004, 017, 018 |
| 8 | 020, 021 |
| 9 | 022 |
| 10 | 023 |
| 11 | 024 |
| 12 | 025 |
| 13 | 030 |
| 14 | 031 |
| 15 | 026 (last slice only: the Haiku baseline, about $1, once the Anthropic usage limit is lifted; it blocks nothing above) |

### Next, after 031 (specs not written yet; drafted one at a time, in this order)

| Order | Spec to write | Why |
| --- | --- | --- |
| 032 | Change a document's type, and work the Unclassified bucket | a wrongly typed document can't be fixed with mocks off |
| 033 | Email: password reset and editing the company | needs an email service (Supabase Auth email or a provider) |
| 034 | Groups with real data | today mock-only |
| 035 | Team and invites | needs 033's email |
| 036 | Launch: mocks off on production, error monitoring, Privacy and Terms | the switch to real customers |
| 037 | Billing: paid plans (only once you decide to charge) | raises the 031 limits for paying companies; brings 029 back |

## Postponed

Decided not now. The loop never picks these; only the owner moves one back into the Plan, when its condition holds.

| # | Spec | Why postponed (decided) | Comes back when |
| --- | --- | --- | --- |
| 027 | [CI eval gate](specs/027-eval-ci-gate.md) | not needed for launch; prompts don't change often (2026-11-26) | after 036, once prompt changes are frequent |
| 028 | [Eval dashboard](specs/028-eval-dashboard.md) | optional; `report.md` is enough (2026-11-26) | evals are run often by more than one person |
| 029 | [Cheaper extraction and an accuracy choice per type](specs/029-cheaper-extraction.md) | Opus and Sonnet cost 20–40× Haiku and no customer pays for that; Haiku already costs about $0.004 per document (2026-11-26) | billing exists (a paid plan can include the stronger tiers); slices 1–3 only if Haiku cost matters |

Dropped for good (don't bring back without a new reason): an Opus baseline for the evals ($11–13; 2026-11-26, 026 runs on Haiku only); a test run just to price Sonnet (its price is published: $2 / $10 per million tokens).

## Editing the plan

- To change the order, edit this table.
- To make a spec buildable, review it and set it to `ready` here and in the spec.
- New spec: copy [specs/_template.md](specs/_template.md), take the next number, add a row to **Status** and put it in a wave.
