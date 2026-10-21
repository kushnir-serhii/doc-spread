# 011 — Settings

**Status:** draft · **Depends on:** 002 · **Route(s):** `/settings`

## Goal
The user maintains company data, the accountant's address, the team and the plan.

## Scope
- In: sections or tabs for Company, Accountant, Team (list plus invite form, mock), Plan (read-only).
- Out: billing checkout, SSO.

## Data
`Company`, `TeamMember`, `TeamRole`, `useCompany()`, `useUpdateCompany()`, `useTeam()`.

## Slices

### [ ] 1. Company + accountant
- **Build:** reuse `company-form.tsx` from 005.
- **Files:** `src/pages/settings/`
- **Accept:**
  - [ ] the tab is in the URL (`?tab=`); save shows pending and announces success or error

### [ ] 2. Team
- **Accept:**
  - [ ] a members table with role badges; the invite form (email plus role) is a mock that adds a pending row

### [ ] 3. Plan
- **Accept:**
  - [ ] current plan and usage (invoices this month) shown read-only

## Backend needs
Team invites and roles, plan and usage endpoints.

## Open questions
- Which plans and limits exist?

## Log
| Date | Slice | Result | Notes / files |
| --- | --- | --- | --- |
