// The function registry (spec 016): every function an expression can call, in one place.
// Adding a function = one new entry in FUNCTIONS (and its id in FUNCTION_IDS). The builder lists
// functions from here and Review evaluates through the same entries.
//
// Currencies are handled by the evaluator, not here: a function sees money as `{ amount }` in minor
// units (all money arguments of one call share a currency) and returns money the same way.
import type { FieldType, FunctionId } from '@/lib/mock/types'

// ---------- results ----------
export type EvalFailureReason = 'missing_value' | 'type_mismatch' | 'currency_mismatch' | 'division_by_zero'

export type EvalResult<T> = { ok: true; value: T } | { ok: false; reason: EvalFailureReason }

export const ok = <T>(value: T): EvalResult<T> => ({ ok: true, value })
export const fail = (reason: EvalFailureReason): { ok: false; reason: EvalFailureReason } => ({ ok: false, reason })

// ---------- expression types ----------
export const EXPR_TYPES = ['text', 'number', 'money', 'date', 'boolean'] as const
/**
 * The type of an expression. Text-like field types (email, phone, tax_id, select) are 'text' here:
 * they can be used wherever text is expected. A table has no expression type; its columns are lists.
 */
export type ExprType = (typeof EXPR_TYPES)[number]

/** A scalar type or a list of one, written `'money[]'` (a table column). */
export type TypeName = ExprType | `${ExprType}[]`

export const exprTypeOfField = (type: FieldType): ExprType | null => {
  switch (type) {
    case 'text':
    case 'email':
    case 'phone':
    case 'tax_id':
    case 'select':
      return 'text'
    case 'number':
    case 'money':
    case 'date':
    case 'boolean':
      return type
    case 'table':
      return null
    default: {
      const unreachable: never = type
      throw new Error(`Unknown field type: ${String(unreachable)}`)
    }
  }
}

/** Money as a function sees it: minor units, no currency. */
export interface MoneyAmount {
  amount: number
}

interface ValueTypes {
  text: string
  number: number
  money: MoneyAmount
  date: string
  boolean: boolean
}

type RuntimeOf<T extends TypeName> = T extends ExprType
  ? ValueTypes[T]
  : T extends `${infer E}[]`
    ? E extends ExprType
      ? ValueTypes[E][]
      : never
    : never

/** The parameter list of `evaluate`, derived from the declared argument types. */
type ArgValues<A extends readonly TypeName[]> = {
  -readonly [K in keyof A]: A[K] extends TypeName ? RuntimeOf<A[K]> : never
}
type NullableArgValues<A extends readonly TypeName[]> = {
  -readonly [K in keyof A]: A[K] extends TypeName ? RuntimeOf<A[K]> | null : never
}

// ---------- signatures ----------
export type SignatureParams =
  | { kind: 'fixed'; args: readonly TypeName[] }
  /** `min` or more arguments, all of type `arg` */
  | { kind: 'variadic'; arg: ExprType; min: number }

export interface Signature {
  params: SignatureParams
  result: ExprType
  /** true: empty arguments are passed as null instead of failing with `missing_value` */
  acceptsEmpty: boolean
  /** Takes the arguments in the declared types (checked where the signature is built); see `fixed`. */
  evaluate: (args: readonly unknown[]) => EvalResult<unknown>
}

const VARIADIC_MIN = 2

/*
 * The three builders below tie `evaluate` to the declared types: its parameter is the tuple of the
 * argument types and its return value is the result type, so a wrong body fails typecheck. The one
 * cast in each erases that type to `Signature`; it is safe because the evaluator only calls
 * `evaluate` with arguments that match the declared signature (see `signatureFits`).
 */
export const fixed = <const A extends readonly TypeName[], R extends ExprType>(
  args: A,
  result: R,
  evaluate: (args: ArgValues<A>) => EvalResult<ValueTypes[R]>,
): Signature => ({
  params: { kind: 'fixed', args },
  result,
  acceptsEmpty: false,
  evaluate: (values) => evaluate(values as ArgValues<A>),
})

export const variadic = <T extends ExprType, R extends ExprType>(
  arg: T,
  result: R,
  evaluate: (args: ValueTypes[T][]) => EvalResult<ValueTypes[R]>,
): Signature => ({
  params: { kind: 'variadic', arg, min: VARIADIC_MIN },
  result,
  acceptsEmpty: false,
  evaluate: (values) => evaluate(values as ValueTypes[T][]),
})

/** Like `fixed`, but empty arguments arrive as null (coalesce, if_empty). */
export const fixedNullable = <const A extends readonly ExprType[], R extends ExprType>(
  args: A,
  result: R,
  evaluate: (args: NullableArgValues<A>) => EvalResult<ValueTypes[R]>,
): Signature => ({
  params: { kind: 'fixed', args },
  result,
  acceptsEmpty: true,
  evaluate: (values) => evaluate(values as NullableArgValues<A>),
})

export const variadicNullable = <T extends ExprType, R extends ExprType>(
  arg: T,
  result: R,
  evaluate: (args: (ValueTypes[T] | null)[]) => EvalResult<ValueTypes[R]>,
): Signature => ({
  params: { kind: 'variadic', arg, min: VARIADIC_MIN },
  result,
  acceptsEmpty: true,
  evaluate: (values) => evaluate(values as (ValueTypes[T] | null)[]),
})

// ---------- function definitions ----------
export const FUNCTION_GROUPS = ['arithmetic', 'lists', 'dates', 'text', 'logic'] as const
export type FunctionGroup = (typeof FUNCTION_GROUPS)[number]

export const FUNCTION_GROUP_LABELS: Record<FunctionGroup, string> = {
  arithmetic: 'Arithmetic',
  lists: 'Lists (table columns)',
  dates: 'Dates',
  text: 'Text',
  logic: 'Logic',
}

export interface FunctionDef<I extends FunctionId = FunctionId> {
  id: I
  label: string
  description: string
  group: FunctionGroup
  signatures: readonly Signature[]
}

// ---------- helpers ----------
const roundHalfAway = (n: number) => Math.sign(n) * Math.round(Math.abs(n))

/** Rounds to `decimals` places, half away from zero, without binary-float surprises (1.005 -> 1.01). */
const roundDecimals = (n: number, decimals: number) => {
  const shifted = Math.round(Number(`${Math.abs(n)}e${decimals}`))
  // very large or small numbers print in exponent form, which the trick above can't extend
  if (Number.isNaN(shifted)) return Math.sign(n) * (Math.round(Math.abs(n) * 10 ** decimals) / 10 ** decimals)
  return Math.sign(n) * Number(`${shifted}e${-decimals}`)
}

const MINOR_DECIMALS = 2

const money = (amount: number): EvalResult<MoneyAmount> => ok({ amount: roundHalfAway(amount) })

const sum = (items: number[]) => items.reduce((total, n) => total + n, 0)

const DAY_MS = 86_400_000
const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/

/** Milliseconds (UTC midnight) of an ISO `yyyy-mm-dd` date, null when it isn't a real date. */
export const parseIsoDate = (text: string): number | null => {
  const match = ISO_DATE.exec(text)
  if (!match) return null
  const [year, month, day] = [Number(match[1]), Number(match[2]), Number(match[3])]
  const ms = Date.UTC(year, month - 1, day)
  const back = new Date(ms)
  return back.getUTCFullYear() === year && back.getUTCMonth() === month - 1 && back.getUTCDate() === day ? ms : null
}

const formatDate = (ms: number) => new Date(ms).toISOString().slice(0, 10)

const daysInMonth = (year: number, monthIndex: number) => new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate()

const withDate = (text: string, change: (ms: number) => number | null): EvalResult<string> => {
  const ms = parseIsoDate(text)
  if (ms === null) return fail('type_mismatch')
  const next = change(ms)
  return next === null ? fail('type_mismatch') : ok(formatDate(next))
}

/** The first non-empty value, or `missing_value` when all are empty. */
const firstPresent = <T>(values: (T | null)[]): EvalResult<T> => {
  for (const value of values) if (value !== null) return ok(value)
  return fail('missing_value')
}

// ---------- the registry ----------
const defineFunction = <I extends FunctionId>(def: FunctionDef<I>): FunctionDef<I> => def

/** Every function. The mapped type makes a missing or misnamed entry a typecheck error. */
export const FUNCTIONS: { [I in FunctionId]: FunctionDef<I> } = {
  // ----- Arithmetic -----
  add: defineFunction({
    id: 'add',
    label: 'Add',
    description: 'The sum of two or more values: Net + VAT.',
    group: 'arithmetic',
    signatures: [
      variadic('number', 'number', (args) => ok(sum(args))),
      variadic('money', 'money', (args) => money(sum(args.map((m) => m.amount)))),
    ],
  }),
  subtract: defineFunction({
    id: 'subtract',
    label: 'Subtract',
    description: 'The first value minus the second: Gross - VAT.',
    group: 'arithmetic',
    signatures: [
      fixed(['number', 'number'], 'number', ([a, b]) => ok(a - b)),
      fixed(['money', 'money'], 'money', ([a, b]) => money(a.amount - b.amount)),
    ],
  }),
  multiply: defineFunction({
    id: 'multiply',
    label: 'Multiply',
    description: 'The first value times the second: Unit price x Quantity.',
    group: 'arithmetic',
    signatures: [
      fixed(['number', 'number'], 'number', ([a, b]) => ok(a * b)),
      fixed(['money', 'number'], 'money', ([a, b]) => money(a.amount * b)),
    ],
  }),
  divide: defineFunction({
    id: 'divide',
    label: 'Divide',
    description: 'The first value divided by the second. Dividing by zero is an error. Money / money is a plain number.',
    group: 'arithmetic',
    signatures: [
      fixed(['number', 'number'], 'number', ([a, b]) => (b === 0 ? fail('division_by_zero') : ok(a / b))),
      fixed(['money', 'number'], 'money', ([a, b]) => (b === 0 ? fail('division_by_zero') : money(a.amount / b))),
      fixed(['money', 'money'], 'number', ([a, b]) =>
        b.amount === 0 ? fail('division_by_zero') : ok(a.amount / b.amount),
      ),
    ],
  }),
  percent: defineFunction({
    id: 'percent',
    label: 'Percent of',
    description: 'A percent of a value: percent(23, Net) is 23% of Net.',
    group: 'arithmetic',
    signatures: [
      fixed(['number', 'number'], 'number', ([a, b]) => ok((a * b) / 100)),
      fixed(['number', 'money'], 'money', ([a, b]) => money((a * b.amount) / 100)),
    ],
  }),
  round: defineFunction({
    id: 'round',
    label: 'Round',
    description:
      'Rounds to a number of decimals (half away from zero). For money, the decimals are those of the major unit: 2 keeps cents, 0 rounds to whole dollars.',
    group: 'arithmetic',
    signatures: [
      fixed(['number', 'number'], 'number', ([a, decimals]) =>
        Number.isInteger(decimals) ? ok(roundDecimals(a, decimals)) : fail('type_mismatch'),
      ),
      fixed(['money', 'number'], 'money', ([a, decimals]) => {
        if (!Number.isInteger(decimals)) return fail('type_mismatch')
        // minor units per rounding step; 1 when the money already has at most that many decimals
        const step = decimals >= MINOR_DECIMALS ? 1 : 10 ** (MINOR_DECIMALS - decimals)
        return money(roundHalfAway(a.amount / step) * step)
      }),
    ],
  }),
  abs: defineFunction({
    id: 'abs',
    label: 'Absolute value',
    description: 'The value without its sign.',
    group: 'arithmetic',
    signatures: [
      fixed(['number'], 'number', ([a]) => ok(Math.abs(a))),
      fixed(['money'], 'money', ([a]) => money(Math.abs(a.amount))),
    ],
  }),
  min: defineFunction({
    id: 'min',
    label: 'Smaller of',
    description: 'The smallest of two or more values.',
    group: 'arithmetic',
    signatures: [
      variadic('number', 'number', (args) => ok(Math.min(...args))),
      variadic('money', 'money', (args) => money(Math.min(...args.map((m) => m.amount)))),
    ],
  }),
  max: defineFunction({
    id: 'max',
    label: 'Larger of',
    description: 'The largest of two or more values.',
    group: 'arithmetic',
    signatures: [
      variadic('number', 'number', (args) => ok(Math.max(...args))),
      variadic('money', 'money', (args) => money(Math.max(...args.map((m) => m.amount)))),
    ],
  }),

  // ----- Lists (table columns). Empty cells are skipped before these run. -----
  sum: defineFunction({
    id: 'sum',
    label: 'Sum',
    description: 'The total of a table column. Empty cells are skipped; a column with no values is an error.',
    group: 'lists',
    signatures: [
      fixed(['number[]'], 'number', ([list]) => (list.length === 0 ? fail('missing_value') : ok(sum(list)))),
      fixed(['money[]'], 'money', ([list]) =>
        list.length === 0 ? fail('missing_value') : money(sum(list.map((m) => m.amount))),
      ),
    ],
  }),
  count: defineFunction({
    id: 'count',
    label: 'Count',
    description: 'How many cells of a table column have a value. 0 when there are none.',
    group: 'lists',
    signatures: [
      fixed(['text[]'], 'number', ([list]) => ok(list.length)),
      fixed(['number[]'], 'number', ([list]) => ok(list.length)),
      fixed(['money[]'], 'number', ([list]) => ok(list.length)),
      fixed(['date[]'], 'number', ([list]) => ok(list.length)),
      fixed(['boolean[]'], 'number', ([list]) => ok(list.length)),
    ],
  }),
  average: defineFunction({
    id: 'average',
    label: 'Average',
    description: 'The mean of a table column. Empty cells are skipped; a column with no values is an error.',
    group: 'lists',
    signatures: [
      fixed(['number[]'], 'number', ([list]) => (list.length === 0 ? fail('missing_value') : ok(sum(list) / list.length))),
      fixed(['money[]'], 'money', ([list]) =>
        list.length === 0 ? fail('missing_value') : money(sum(list.map((m) => m.amount)) / list.length),
      ),
    ],
  }),
  min_of: defineFunction({
    id: 'min_of',
    label: 'Smallest in column',
    description: 'The smallest value of a table column.',
    group: 'lists',
    signatures: [
      fixed(['number[]'], 'number', ([list]) => (list.length === 0 ? fail('missing_value') : ok(Math.min(...list)))),
      fixed(['money[]'], 'money', ([list]) =>
        list.length === 0 ? fail('missing_value') : money(Math.min(...list.map((m) => m.amount))),
      ),
    ],
  }),
  max_of: defineFunction({
    id: 'max_of',
    label: 'Largest in column',
    description: 'The largest value of a table column.',
    group: 'lists',
    signatures: [
      fixed(['number[]'], 'number', ([list]) => (list.length === 0 ? fail('missing_value') : ok(Math.max(...list)))),
      fixed(['money[]'], 'money', ([list]) =>
        list.length === 0 ? fail('missing_value') : money(Math.max(...list.map((m) => m.amount))),
      ),
    ],
  }),

  // ----- Dates (ISO yyyy-mm-dd, UTC, no locale) -----
  days_between: defineFunction({
    id: 'days_between',
    label: 'Days between',
    description: 'The number of days from the first date to the second (negative if the second is earlier).',
    group: 'dates',
    signatures: [
      fixed(['date', 'date'], 'number', ([a, b]) => {
        const from = parseIsoDate(a)
        const to = parseIsoDate(b)
        return from === null || to === null ? fail('type_mismatch') : ok(Math.round((to - from) / DAY_MS))
      }),
    ],
  }),
  add_days: defineFunction({
    id: 'add_days',
    label: 'Add days',
    description: 'A date plus a number of days (negative goes back).',
    group: 'dates',
    signatures: [
      fixed(['date', 'number'], 'date', ([date, days]) =>
        Number.isInteger(days) ? withDate(date, (ms) => ms + days * DAY_MS) : fail('type_mismatch'),
      ),
    ],
  }),
  add_months: defineFunction({
    id: 'add_months',
    label: 'Add months',
    description: 'A date plus a number of months. If the month is shorter, the last day of that month is used.',
    group: 'dates',
    signatures: [
      fixed(['date', 'number'], 'date', ([date, months]) => {
        if (!Number.isInteger(months)) return fail('type_mismatch')
        return withDate(date, (ms) => {
          const d = new Date(ms)
          const target = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + months, 1))
          const day = Math.min(d.getUTCDate(), daysInMonth(target.getUTCFullYear(), target.getUTCMonth()))
          return Date.UTC(target.getUTCFullYear(), target.getUTCMonth(), day)
        })
      }),
    ],
  }),
  end_of_month: defineFunction({
    id: 'end_of_month',
    label: 'End of month',
    description: 'The last day of the date\'s month.',
    group: 'dates',
    signatures: [
      fixed(['date'], 'date', ([date]) =>
        withDate(date, (ms) => {
          const d = new Date(ms)
          return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), daysInMonth(d.getUTCFullYear(), d.getUTCMonth()))
        }),
      ),
    ],
  }),

  // ----- Text -----
  concat: defineFunction({
    id: 'concat',
    label: 'Join text',
    description: 'Two or more texts joined into one, with nothing between them.',
    group: 'text',
    signatures: [variadic('text', 'text', (args) => ok(args.join('')))],
  }),
  upper: defineFunction({
    id: 'upper',
    label: 'Uppercase',
    description: 'The text in capital letters.',
    group: 'text',
    signatures: [fixed(['text'], 'text', ([a]) => ok(a.toUpperCase()))],
  }),
  lower: defineFunction({
    id: 'lower',
    label: 'Lowercase',
    description: 'The text in small letters.',
    group: 'text',
    signatures: [fixed(['text'], 'text', ([a]) => ok(a.toLowerCase()))],
  }),
  trim: defineFunction({
    id: 'trim',
    label: 'Trim',
    description: 'The text without spaces at the start and end.',
    group: 'text',
    signatures: [fixed(['text'], 'text', ([a]) => ok(a.trim()))],
  }),

  // ----- Logic. All arguments have the same type. -----
  coalesce: defineFunction({
    id: 'coalesce',
    label: 'First filled',
    description: 'The first of two or more values that is not empty. An error if all are empty.',
    group: 'logic',
    signatures: [
      variadicNullable('text', 'text', firstPresent),
      variadicNullable('number', 'number', firstPresent),
      variadicNullable('money', 'money', firstPresent),
      variadicNullable('date', 'date', firstPresent),
      variadicNullable('boolean', 'boolean', firstPresent),
    ],
  }),
  if_empty: defineFunction({
    id: 'if_empty',
    label: 'If empty',
    description: 'The value, or the fallback when the value is empty. An error if both are empty.',
    group: 'logic',
    signatures: [
      fixedNullable(['text', 'text'], 'text', firstPresent),
      fixedNullable(['number', 'number'], 'number', firstPresent),
      fixedNullable(['money', 'money'], 'money', firstPresent),
      fixedNullable(['date', 'date'], 'date', firstPresent),
      fixedNullable(['boolean', 'boolean'], 'boolean', firstPresent),
    ],
  }),
}

/** Every function, grouped in the order the UI shows them (the order of FUNCTION_GROUPS, then of the registry). */
export const FUNCTION_LIST: readonly FunctionDef[] = FUNCTION_GROUPS.flatMap((group) =>
  Object.values<FunctionDef>(FUNCTIONS).filter((fn) => fn.group === group),
)

export const getFunction = (id: FunctionId): FunctionDef => FUNCTIONS[id]

// ---------- matching (used by the evaluator and the builder) ----------
/** The type of each argument slot of a signature, for `count` arguments. */
const paramTypes = (params: SignatureParams, count: number): readonly TypeName[] =>
  params.kind === 'fixed' ? params.args : Array.from({ length: count }, () => params.arg)

/**
 * Does the signature accept arguments of these types? `null` is a slot whose type isn't chosen yet
 * and fits anything. `partial: true` allows fewer arguments than the signature needs (the builder
 * is still adding them); otherwise the count must be valid.
 */
export const signatureFits = (
  signature: Signature,
  argTypes: readonly (TypeName | null)[],
  { partial = false }: { partial?: boolean } = {},
): boolean => {
  const { params } = signature
  if (params.kind === 'fixed') {
    if (partial ? argTypes.length > params.args.length : argTypes.length !== params.args.length) return false
  } else if (!partial && argTypes.length < params.min) {
    return false
  }
  const expected = paramTypes(params, argTypes.length)
  return argTypes.every((type, i) => type === null || type === expected[i])
}

/** The signatures of a function that fit these argument types; the builder offers the function when any fits. */
export const findSignatures = (
  fn: FunctionDef,
  argTypes: readonly (TypeName | null)[],
  options?: { partial?: boolean },
): Signature[] => fn.signatures.filter((signature) => signatureFits(signature, argTypes, options))

/** The signatures of a function that produce this result type. */
export const signaturesForResult = (fn: FunctionDef, result: ExprType): Signature[] =>
  fn.signatures.filter((signature) => signature.result === result)

/**
 * The functions that fit the given argument types (partial by default, for the builder) and, when
 * `result` is set, can produce that type.
 */
export const functionsFor = (
  argTypes: readonly (TypeName | null)[],
  result?: ExprType,
  options: { partial?: boolean } = { partial: true },
): FunctionDef[] =>
  FUNCTION_LIST.filter((fn) =>
    findSignatures(fn, argTypes, options).some((signature) => result === undefined || signature.result === result),
  )

/** The result type for these argument types, null when no signature fits. */
export const resultTypeOf = (fn: FunctionDef, argTypes: readonly (TypeName | null)[]): ExprType | null =>
  findSignatures(fn, argTypes)[0]?.result ?? null
