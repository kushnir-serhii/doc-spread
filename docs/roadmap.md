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
| 025 | [Golden dataset: invoices and receipts with known answers](specs/025-golden-dataset.md) | in-progress | 023 |
| 026 | [Extraction evals: runner, scoring and analysis](specs/026-extraction-evals.md) | draft | 025 |
| 027 | [CI eval gate](specs/027-eval-ci-gate.md) | draft | 026 |
| 028 | [Eval dashboard (optional, FastAPI)](specs/028-eval-dashboard.md) | draft | 026 |

Statuses: `draft` → `ready` → `in-progress` → `done` (meaning in [process.md](process.md#statuses)). The status here and in the spec's header must match.

## Plan

Read top to bottom; the next spec is the first one that isn't `done`. Specs in one wave don't depend on each other and can run in parallel; otherwise they are built in the listed order.

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
| 13 | 026 |
| 14 | 027, 028 |

- To change the order, edit this table.
- To make a spec buildable, review it and set it to `ready` here and in the spec.
- New spec: copy [specs/_template.md](specs/_template.md), take the next number, add a row to **Status** and put it in a wave.
