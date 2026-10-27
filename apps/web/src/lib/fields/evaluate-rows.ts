// Row actions (spec 017): computed table columns and per-row checks.
// Order everywhere: computed columns -> computed fields -> checks (see run-checks.ts).
import type {
  AnyExtractedValue,
  CheckAction,
  DocumentType,
  FieldValue,
  RowCheckAction,
  RowComputeAction,
  TableValue,
} from '@/lib/mock/types'
import { getAllComputedColumnIds, getComputedFieldIds, getRowComputeActions } from './computed-fields'
import {
  collectCellColumnIds,
  collectFieldIds,
  evaluateExpr,
  findEmptyInputs,
  runCheck,
  toExtracted,
  type EvalContext,
  type EvalValue,
  type RowContext,
} from './evaluate'
import type { EvalFailureReason } from './functions'

type RowType = Pick<DocumentType, 'fields' | 'actions'>

// ---------- computed columns ----------
/** What happened to one computed cell. A failed cell has no value (it counts as empty for everything that reads it). */
export type RowComputeOutcome =
  | { ok: true; value: AnyExtractedValue }
  | {
      ok: false
      reason: EvalFailureReason | 'cycle'
      /** the columns involved: of the same table (the cells read, or the columns of the cycle) */
      columnIds: string[]
      /** the top-level fields involved */
      fieldIds: string[]
    }

/** table field id -> row id -> column id -> outcome. Only tables with computed columns appear. */
export type RowComputeOutcomes = Record<string, Record<string, Record<string, RowComputeOutcome>>>

const withoutKeys = <T>(record: Record<string, T>, keys: ReadonlySet<string>): Record<string, T> =>
  Object.fromEntries(Object.entries(record).filter(([key]) => !keys.has(key)))

/** The values with the stored cells of computed columns removed (they are ignored, like stored computed fields). */
const stripComputedCells = (type: RowType, values: Record<string, FieldValue>): Record<string, FieldValue> => {
  const byTable = getRowComputeActions(type)
  if (byTable.size === 0) return values
  const stripped: Record<string, FieldValue> = { ...values }
  for (const [tableId, columns] of byTable) {
    const value = values[tableId]
    if (value?.type !== 'table') continue
    const ids = new Set(columns.keys())
    stripped[tableId] = { ...value, rows: value.rows.map((row) => ({ ...row, cells: withoutKeys(row.cells, ids) })) }
  }
  return stripped
}

/**
 * The computing order of one table's computed columns (a column that reads another computed column of the
 * same table comes after it), and the columns that are part of a cycle (each maps to the whole cycle).
 */
const orderColumns = (actions: ReadonlyMap<string, RowComputeAction>) => {
  const order: string[] = []
  const done = new Set<string>()
  const cycles = new Map<string, string[]>()
  const stack: string[] = []

  const resolve = (columnId: string) => {
    if (done.has(columnId)) return
    const at = stack.indexOf(columnId)
    if (at !== -1) {
      const cycle = stack.slice(at)
      for (const id of cycle) {
        cycles.set(id, cycle)
        done.add(id)
      }
      return
    }
    const action = actions.get(columnId)
    if (!action) return
    stack.push(columnId)
    for (const dependency of collectCellColumnIds(action.expr)) if (actions.has(dependency)) resolve(dependency)
    stack.pop()
    // a deeper call may have found that this column is part of a cycle
    if (done.has(columnId)) return
    done.add(columnId)
    order.push(columnId)
  }

  for (const columnId of actions.keys()) resolve(columnId)
  return { order, cycles }
}

/**
 * Evaluates the row compute actions on every row of every table, per row in dependency order (a computed
 * column can feed another one of the same table). Stored values of computed cells are ignored. A cycle fails
 * the column in every row with `cycle` (naming the columns of the cycle); a cell that reads a failed cell
 * gets `missing_value`.
 */
export const computeRowValues = (type: RowType, values: Record<string, FieldValue>): RowComputeOutcomes => {
  const byTable = getRowComputeActions(type)
  const outcomes: RowComputeOutcomes = {}
  if (byTable.size === 0) return outcomes

  const stripped = stripComputedCells(type, values)
  const computedFieldIds = getComputedFieldIds(type)
  const pendingColumnIds = getAllComputedColumnIds(type)

  for (const [tableId, actions] of byTable) {
    const table = type.fields.find((f) => f.id === tableId)
    const value = stripped[tableId]
    if (table?.type !== 'table' || value?.type !== 'table') continue
    const { order, cycles } = orderColumns(actions)

    const tableOutcomes: Record<string, Record<string, RowComputeOutcome>> = {}
    for (const row of value.rows) {
      const cells = { ...row.cells }
      const rowOutcomes: Record<string, RowComputeOutcome> = {}
      for (const [columnId, cycle] of cycles) {
        rowOutcomes[columnId] = { ok: false, reason: 'cycle', columnIds: cycle, fieldIds: [] }
      }
      for (const columnId of order) {
        const action = actions.get(columnId)
        if (!action) continue
        const rowContext: RowContext = { tableFieldId: tableId, cells, computedFieldIds, pendingColumnIds }
        const ctx: EvalContext = { fields: type.fields, values: stripped, row: rowContext }
        const result = evaluateExpr(action.expr, ctx)
        const column = table.columns?.find((c) => c.id === columnId)
        const extracted = result.ok && column ? toExtracted(column, result.value) : null
        if (extracted) {
          cells[columnId] = extracted
          rowOutcomes[columnId] = { ok: true, value: extracted }
          continue
        }
        const reason = result.ok || !column ? 'type_mismatch' : result.reason
        const empty = reason === 'missing_value' ? findEmptyInputs(action.expr, ctx) : null
        rowOutcomes[columnId] = {
          ok: false,
          reason,
          columnIds: empty ? empty.columnIds : collectCellColumnIds(action.expr),
          fieldIds: empty ? empty.fieldIds : collectFieldIds(action.expr),
        }
      }
      tableOutcomes[row.id] = rowOutcomes
    }
    outcomes[tableId] = tableOutcomes
  }
  return outcomes
}

/**
 * The values with the computed cells written into the rows (confidence 1, the column's type). A cell that
 * can't be computed is removed (its stored value is treated as empty), like a failed computed field.
 */
export const applyComputedCells = (type: RowType, values: Record<string, FieldValue>): Record<string, FieldValue> => {
  const outcomes = computeRowValues(type, values)
  const tableIds = Object.keys(outcomes)
  if (tableIds.length === 0) return values
  const stripped = stripComputedCells(type, values)
  const result: Record<string, FieldValue> = { ...stripped }
  for (const tableId of tableIds) {
    const value = stripped[tableId]
    if (value?.type !== 'table') continue
    const rows: TableValue['rows'] = value.rows.map((row) => {
      const cells = { ...row.cells }
      for (const [columnId, outcome] of Object.entries(outcomes[tableId][row.id] ?? {})) {
        if (outcome.ok) cells[columnId] = outcome.value
      }
      return { ...row, cells }
    })
    result[tableId] = { type: 'table', rows }
  }
  return result
}

// ---------- row checks ----------
/** The result of a row check on one row (rows where every input is empty have no entry at all). */
export type RowCheckRowOutcome =
  | { status: 'passed'; rowId: string; index: number; left: EvalValue; right: EvalValue }
  | { status: 'failed'; rowId: string; index: number; left: EvalValue; right: EvalValue }
  | {
      status: 'error'
      rowId: string
      index: number
      reason: EvalFailureReason
      /** every top-level field the check reads */
      fieldIds: string[]
      /** every column the check reads as this row's cell */
      columnIds: string[]
      /** of those, the ones without a value (what `missing_value` is about) */
      emptyFieldIds: string[]
      emptyColumnIds: string[]
    }

/**
 * One row check on a table: an outcome per checked row, in row order (`index` is the 0-based position of the
 * row in the table). A row where every input is empty is skipped; a table without rows has `rows: []`.
 * `rowCount` is the number of rows in the table, skipped ones included.
 */
export interface RowCheckOutcome {
  check: RowCheckAction
  rowCount: number
  rows: RowCheckRowOutcome[]
}

const runRowCheck = (
  check: RowCheckAction,
  type: RowType,
  values: Record<string, FieldValue>,
  computedFieldIds: ReadonlySet<string>,
): RowCheckOutcome => {
  const table = values[check.tableFieldId]
  const tableRows = table?.type === 'table' ? table.rows : []
  const outcome: RowCheckOutcome = { check, rowCount: tableRows.length, rows: [] }
  // the evaluator's check, with this check's sides
  const asCheck: CheckAction = { ...check, kind: 'check' }
  const fieldIds = [...new Set([...collectFieldIds(check.left), ...collectFieldIds(check.right)])]
  const columnIds = [...new Set([...collectCellColumnIds(check.left), ...collectCellColumnIds(check.right)])]

  tableRows.forEach((row, index) => {
    const rowContext: RowContext = {
      tableFieldId: check.tableFieldId,
      cells: row.cells,
      computedFieldIds,
      pendingColumnIds: new Set(),
    }
    const ctx: EvalContext = { fields: type.fields, values, row: rowContext }
    const [left, right] = [findEmptyInputs(check.left, ctx), findEmptyInputs(check.right, ctx)]
    const emptyFieldIds = [...new Set([...left.fieldIds, ...right.fieldIds])]
    const emptyColumnIds = [...new Set([...left.columnIds, ...right.columnIds])]
    const inputCount = fieldIds.length + columnIds.length
    if (inputCount > 0 && emptyFieldIds.length + emptyColumnIds.length === inputCount) return

    const result = runCheck(asCheck, ctx)
    if (result.status === 'error') {
      outcome.rows.push({
        status: 'error',
        rowId: row.id,
        index,
        reason: result.reason,
        fieldIds,
        columnIds,
        emptyFieldIds: result.emptyFieldIds,
        emptyColumnIds: result.reason === 'missing_value' ? emptyColumnIds : [],
      })
      return
    }
    outcome.rows.push({ status: result.status, rowId: row.id, index, left: result.left, right: result.right })
  })
  return outcome
}

/**
 * Runs every row check of the type. `values` must already hold the computed cells and computed fields
 * (`resolveValues` in run-checks.ts); a row check can't read computed fields, but a column list can read computed cells.
 */
export const runRowChecks = (type: RowType, values: Record<string, FieldValue>): RowCheckOutcome[] => {
  const computedFieldIds = getComputedFieldIds(type)
  return type.actions.flatMap((action) =>
    action.kind === 'row_check' ? [runRowCheck(action, type, values, computedFieldIds)] : [],
  )
}
