# 011 — Settings

**Status:** draft · **Depends on:** 002 · **Route(s):** `/settings`

## Goal
The user maintains company data, the saved export recipients, the team and the plan.

## Scope
- In: sections or tabs for Company (including **Language and formats**), Export recipients (a list of name plus email, e.g. the accountant), Team (list plus invite form, mock), Plan (read-only).
- Out: billing checkout, SSO.

## Data
`Company`, `TeamMember`, `TeamRole`, `useCompany()`, `useUpdateCompany()`, `useTeam()`.

**Language and formats:** dates, numbers and amounts use the browser's locale by default. A company can pick a locale instead (`Company.locale`, `null` = browser), and every formatter takes it from there; the default currency is the company's `defaultCurrency`, else USD (conventions.md, Money).

## Slices

### [ ] 1. Company + export recipients
- **Build:** reuse `company-form.tsx` from 005. Recipients: add, edit, remove, with email validation.
- **Files:** `src/pages/settings/`
- **Accept:**
  - [ ] the tab is in the URL (`?tab=`); save shows pending and announces success or error
  - [ ] "Language and formats": "Browser default (<detected locale>)" or a chosen locale, with a live preview of a date, a number and an amount; after saving, every screen formats with it

### [ ] 2. Team
- **Accept:**
  - [ ] a members table with role badges; the invite form (email plus role) is a mock that adds a pending row

### [ ] 3. Plan
- **Accept:**
  - [ ] current plan and usage (documents processed this month, number of types) shown read-only

## Backend needs
Team invites and roles, plan and usage endpoints; `Company.locale` (nullable: browser default).

## Open questions
- Which plans and limits exist?

## Log
| Date | Slice | Result | Notes / files |
| --- | --- | --- | --- |
| 2026-10-26 | — | rescoped | Language and formats: browser locale by default, a company can choose one (decided in 008 review) |
| 2026-10-22 | — | rescoped | accountant → export recipients; usage counts documents |
