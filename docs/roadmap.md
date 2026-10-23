# Roadmap

The single source of truth for what is done, what is next, and in which order. `/run-implement` (`/run-i`) reads this file. The process behind it is in [process.md](process.md).

## Status

| # | Spec | Status | Depends on |
| --- | --- | --- | --- |
| 001 | [Lazy-loaded routes](specs/001-lazy-routes.md) | done | — |
| 002 | [Query layer (lib/api)](specs/002-query-layer.md) | done | 012 |
| 003 | [Landing](specs/003-landing.md) | draft | 001 |
| 004 | [Auth](specs/004-auth.md) | draft | 001 |
| 005 | [Onboarding](specs/005-onboarding.md) | draft | 002, 014 |
| 006 | [Inbox](specs/006-inbox.md) | draft | 002, 012 |
| 007 | [Upload](specs/007-upload.md) | in-progress | 002, 012 |
| 008 | [Review](specs/008-review.md) | draft | 002, 006, 013 |
| 009 | [Export](specs/009-export.md) | draft | 002, 006 |
| 010 | [Groups](specs/010-groups.md) | draft | 002, 014 |
| 011 | [Settings](specs/011-settings.md) | draft | 002 |
| 012 | [Document model](specs/012-document-model.md) | done | — |
| 013 | [Document viewer](specs/013-document-viewer.md) | done | 002, 012 |
| 014 | [Document types (builder)](specs/014-document-types.md) | draft | 002, 012 |
| 015 | [Type from a sample](specs/015-type-from-sample.md) | draft | 013, 014 |
| 016 | [Field actions](specs/016-field-actions.md) | draft | 008, 014 |

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
| 6 | 016, 009, 010 |
| 7 | 005, 011, 003, 004 |

- To change the order, edit this table.
- To make a spec buildable, review it and set it to `ready` here and in the spec.
- New spec: copy [specs/_template.md](specs/_template.md), take the next number, add a row to **Status** and put it in a wave.
