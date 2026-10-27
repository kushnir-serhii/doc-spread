# 011 — Settings

**Status:** in-progress · **Depends on:** 002 · **Route(s):** `/settings`

## Goal
The user maintains company data, how dates, numbers and amounts are formatted, the saved export recipients, the team and sees the plan.

## Scope
- In: four tabs in the URL (`?tab=company|recipients|team|plan`, default `company`): Company (company form + **Language and formats**), Export recipients (a list of name plus email, e.g. the accountant), Team (list plus invite form, mock), Plan (read-only).
- Out: billing checkout, changing plans, SSO, changing a member's role or removing members.

## Data
`Company`, `Recipient`, `TeamMember`, `TeamRole`, `useCompany()`, `useUpdateCompany()`, `useTeam()`; new: `Company.locale`, `TeamMember.status`, `useInviteMember()`, `Plan`, `PlanUsage`, `usePlan()`.

**Language and formats:** dates, numbers and amounts use the browser's locale by default. A company can pick a locale instead (`Company.locale`, `null` = browser), and every formatter takes it from there; the default currency is the company's `defaultCurrency`, else USD (conventions.md, Money).

**Decided:**
- Tabs reuse the accessible tab pattern of Export (roving tabindex, arrows, Home/End), in a settings-owned component.
- `Company.accountantEmail` is removed (replaced by `recipients`); seed export jobs use the recipient's email.
- The locale reaches every screen through a React context set in `AppShell` from `useCompany().data.locale`, read with `useFormatLocale()`. Components pass it to `formatMoney`, `formatDate`, `formatFieldValue`, `formatEvalValue` and `Intl.NumberFormat`; plain helpers take it as a parameter. No module-level global.
- Locale list: "Browser default (<detected>)" plus en-US, en-GB, de-DE, fr-FR, es-ES, it-IT, nl-NL, pt-BR, pl-PL, cs-CZ, sv-SE, uk-UA, ja-JP, zh-CN, each labelled with `Intl.DisplayNames` in its own language. None is a default.
- Plans (mock): Free — 50 documents/month, 3 types; Pro — 1,000 documents/month, unlimited types; Business — 10,000 documents/month, unlimited types. The mock company is on Pro. No change-plan button; a note says billing comes later.

## Slices

### [x] 1. Settings page, tabs, company + export recipients
- **Build:** replace the `/settings` placeholder (delete `placeholder-page.tsx` and the router's `placeholder` helper). Tabs in `?tab=`. Company tab: reuse `features/company/company-form.tsx` from 005 unchanged, own Save. Recipients tab: list of saved recipients; add, edit inline, remove with a confirm dialog; each change saves at once through `useUpdateCompany({ recipients })`. Remove `Company.accountantEmail`.
- **Files:** `src/pages/settings/`, `src/features/settings/`, `src/app/router.tsx`, `src/lib/mock/types.ts`, `src/lib/mock/data.ts`
- **Accept:**
  - [x] the tab is in the URL (`?tab=`); an unknown value falls back to Company; tabs work from the keyboard
  - [x] company save shows pending and announces success or error
  - [x] recipients: name and email required, email validated, no duplicate email; add, edit and remove each show pending and announce the result; remove asks first; empty list explains and offers Add
  - [x] loading skeleton and error with retry for the company query; long names and emails wrap or truncate with a title; works at 375px
  - [x] the Export recipient picker shows the edited list

### [x] 2. Language and formats
- **Build:** a "Language and formats" card on the Company tab with its own Save: a locale select ("Browser default (<detected locale>)" or one of the listed locales) and a live preview of a date, a number and an amount (in the company's default currency). `Company.locale: string | null`. A `FormatLocaleProvider` in `AppShell` and `useFormatLocale()`; thread the locale into every formatter call site.
- **Files:** `src/features/settings/`, `src/lib/format-locale/` (or `src/lib/fields/`), `src/components/layout/app-shell.tsx`, every file that calls a formatter
- **Accept:**
  - [x] "Browser default (<detected locale>)" or a chosen locale, with a live preview of a date, a number and an amount that follows the select before saving
  - [x] save shows pending and announces success or error
  - [x] after saving, every screen formats with it (Inbox, Review, Groups, Export, Types, Design); "Browser default" goes back to the browser's locale
  - [x] no hard-coded locale anywhere; no formatter call site is left without the locale (except locale-independent code such as CSV values and ISO dates)

### [x] 3. Team
- **Build:** members table with role badges; `TeamMember.status: 'active' | 'invited'`; invite form (email plus role Admin or Member) through a new `useInviteMember()` mock that adds a pending row.
- **Files:** `src/features/settings/`, `src/lib/api/team.ts`, `src/lib/mock/`
- **Accept:**
  - [x] a members table with role badges; invited members show their email and a "Pending" badge
  - [x] the invite form (email plus role) is a mock that adds a pending row; email validated; an email already on the team is an error; pending and the result are announced
  - [x] loading skeleton, error with retry; cards instead of the table at 375px; long names and emails handled

### [x] 4. Plan
- **Build:** `usePlan()` returning the plan and usage (documents uploaded this calendar month, number of types) from the mock.
- **Files:** `src/features/settings/`, `src/lib/api/`, `src/lib/mock/`
- **Accept:**
  - [x] current plan and usage (documents processed this month, number of types) shown read-only, with limits and progress bars ("Unlimited" without a bar)
  - [x] a note that plan changes come with billing later; no checkout
  - [x] loading skeleton, error with retry

## Backend needs
Team invites and roles (`TeamMember.status`), plan and usage endpoints; `Company.locale` (nullable: browser default); recipients stored per company.

## Open questions
- Which plans and limits exist?
  **Decided:** Free / Pro / Business as above, mock; the real list comes with billing.

## Log
| Date | Slice | Result | Notes / files |
| --- | --- | --- | --- |
| 2026-10-27 | 4 | done | Plan/PlanUsage types, PLANS mock (company on Pro), getPlanUsage() + usePlan(); upload and type creation invalidate plan usage; plan card with usage meters (<progress>, warning ≥90%) · features/settings/plan-tab.tsx, usage-meter.tsx; lib/api/plan.ts; mock/ |
| 2026-10-27 | 3 | done | TeamMember.status + nullable name, inviteTeamMember mock + useInviteMember(); members table (cards below sm), role and Pending badges, invite form · features/settings/team-*, invite-*, role-badge, member-pending-badge; lib/api/team.ts; mock/ |
| 2026-10-27 | 2 | done | Company.locale; FormatLocaleProvider in AppShell + useFormatLocale(); locale threaded into every formatter call (~25 files; helpers take a locale param); Language and formats card with live preview · lib/format-locale/, features/settings/locale-*.tsx, app-shell.tsx, formatter call sites |
| 2026-10-27 | 1 | done | settings page + URL tabs, company tab (CompanyForm reused), recipients add/edit/remove; accountantEmail removed; placeholder page deleted · pages/settings/, features/settings/, router.tsx, mock/types.ts, mock/data.ts |
| 2026-10-27 | — | ready | questions settled: 4 slices (locale threading split out), URL tabs, accountantEmail removed, locale via context, plans mocked |
| 2026-10-26 | — | rescoped | Language and formats: browser locale by default, a company can choose one (decided in 008 review) |
| 2026-10-22 | — | rescoped | accountant → export recipients; usage counts documents |
