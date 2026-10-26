# 016 — Field actions (checks and computed fields)

**Status:** ready · **Depends on:** 008, 014 · **Route(s):** `/types/:typeId` (an "Actions" section of the builder)

## Goal
The user adds actions to a type that work across fields: **checks** ("Gross = Net + VAT", "Total = sum of the Amount column") that warn or block approval in Review, and **computed fields** ("Due in days = Due date − Issue date") that are calculated instead of extracted. Functions live in a registry, so a new function is added in one place without touching the builder or Review.

## Scope
- In: a function registry, expressions built as a tree (not a text formula), checks with a severity and a tolerance, computed fields, an action editor in the builder, evaluation in Review, actions in templates (the Invoice totals check).
- Out: free-text formulas, user-defined functions, conditions that show or hide fields, calls to external services.

## Data
Extends `DocumentType` (012) with `actions: FieldAction[]`. Sketch:

```ts
/** An expression is a tree: a field, a table column, a constant, or a function call. */
export type Expr =
  | { kind: 'field'; fieldId: string }
  | { kind: 'column'; fieldId: string; columnId: string }   // all values of a table column
  | { kind: 'const'; type: ScalarFieldType; value: unknown }
  | { kind: 'call'; fn: FunctionId; args: Expr[] }

export interface CheckAction {
  kind: 'check'
  id: string
  label: string                        // "Gross = Net + VAT"
  left: Expr
  op: 'eq' | 'neq' | 'lt' | 'lte' | 'gt' | 'gte'
  right: Expr
  /** allowed difference in minor units of the document's currency, e.g. 1 cent for rounding */
  tolerance?: number
  severity: 'warning' | 'blocking'
}

export interface ComputeAction {
  kind: 'compute'
  id: string
  /** the target field; it is marked computed and never extracted */
  fieldId: string
  expr: Expr
}

export type FieldAction = CheckAction | ComputeAction
```

**The function registry** (`src/lib/fields/functions.ts`): each entry declares its id, label, description, argument types (including "list of" for columns), result type, and a pure `evaluate`. The builder lists functions from the registry and offers only the ones whose arguments fit; Review evaluates through the same registry. Adding a function = one new entry.

Starting set (grouped as they would appear in the UI):

| Group | Functions |
| --- | --- |
| Arithmetic | `add`, `subtract`, `multiply`, `divide`, `percent` (a % of b), `round` (to n decimals), `abs`, `min`, `max` |
| Lists (table columns) | `sum`, `count`, `average`, `min_of`, `max_of` |
| Dates | `days_between`, `add_days`, `add_months`, `end_of_month` |
| Text | `concat`, `upper`, `lower`, `trim` |
| Logic | `coalesce` (first non-empty), `if_empty` |

Money follows the existing rules: arithmetic on money stays in minor units, and adding or comparing two different currencies is an evaluation error, not a silent result.

## Slices

### [ ] 1. Types + registry + evaluation
- **Build:** the types above, the registry with the starting set, `evaluateExpr(expr, document)` and `runChecks(type, document)`.
- **Files:** `src/lib/mock/types.ts`, `src/lib/fields/functions.ts`, `src/lib/fields/evaluate.ts`
- **Accept:**
  - [ ] the result is a discriminated union `{ ok: true; value } | { ok: false; reason: 'missing_value' | 'type_mismatch' | 'currency_mismatch' | 'division_by_zero' }`
  - [ ] the registry type checks argument and result types, so adding an entry with a wrong `evaluate` fails typecheck
  - [ ] the Invoice template gets "Gross = Net + VAT" and "Net = sum of line nets" checks (tolerance 1, warning)

### [ ] 2. Action editor in the builder
- **Build:** an "Actions" section in 014: Add action → Check or Computed field. The expression is built by picking: a field / a column / a constant / a function, then its arguments, the same way at every level of nesting.
- **Accept:**
  - [ ] only the fields and functions whose types fit are offered at each step; the expression is shown as a readable line ("Net + VAT")
  - [ ] a check has an operator, a tolerance (for numbers and money) and a severity
  - [ ] a computed field can't refer to itself or form a cycle with another computed field; the error says which fields
  - [ ] a live preview evaluates the action on a sample document of the type

### [ ] 3. Actions in Review
- **Accept:**
  - [ ] failed checks are listed above the form with both sides' values ("Gross $1,230.00 ≠ Net + VAT $1,229.00"), and the fields involved are highlighted
  - [ ] a blocking check stops Approve and says why; a warning lets the user approve after confirming
  - [ ] computed fields are read-only, show "computed" and update as soon as their inputs change
  - [ ] an evaluation error (missing value, currency mismatch) is shown as its own state, not as a failed check

## Backend needs
Store actions with the type version; evaluate the same checks on the server before approval and before export (the frontend registry is the reference); computed values included in exports.

## Open questions
- **Decided (2026-10-26):** the first release ships the full starting set, all 25 functions in the table. The builder has to look like the real product: every group and function shown with its label and description, so the design can be judged on the complete set.
- **Decided (2026-10-26):** no Inbox badge for now. Checks run only in Review and in the builder preview. A "check failed" badge on Inbox rows may come later as its own spec.
- **Decided (2026-10-26):** slice 3 fits into the Approve flow from 008 slice 5 and doesn't duplicate it. A blocking check that fails joins the existing list of Approve problems (`review-issues.tsx` / `use-review-actions.ts`) next to the field-validation issues and uses the same "go to field" behaviour. Warnings use the same component in a non-blocking variant, then a confirmation on Approve. There is no second list and no second Approve path.
- **Decided (2026-10-26):** the examples and the mock use USD, and the tolerance is in minor units of the document's own currency. No PLN or other country defaults.

## Log
| Date | Slice | Result | Notes / files |
| --- | --- | --- | --- |
