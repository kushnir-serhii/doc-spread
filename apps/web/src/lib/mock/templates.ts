import type { ColumnDef, DocumentType, FieldAction, FieldDef, ScalarFieldType } from './types'

export type DocumentTemplate = Omit<DocumentType, 'version' | 'updatedAt'>

const slug = (key: string) => key.replaceAll('_', '-')

interface FieldOptions {
  required?: boolean
  options?: string[]
  groupable?: boolean
}

const makeField = (
  typeSlug: string,
  key: string,
  label: string,
  type: ScalarFieldType,
  hint: string,
  { required = false, options, groupable }: FieldOptions = {},
): FieldDef => ({
  id: `tpl-${typeSlug}-f-${slug(key)}`,
  key,
  label,
  type,
  required,
  hint,
  ...(options && { options }),
  ...(groupable && { groupable }),
  examples: [],
})

const makeTable = (
  typeSlug: string,
  key: string,
  label: string,
  hint: string,
  columns: ColumnDef[],
): FieldDef => ({
  id: `tpl-${typeSlug}-f-${slug(key)}`,
  key,
  label,
  type: 'table',
  required: false,
  hint,
  columns,
  examples: [],
})

const makeColumn = (
  typeSlug: string,
  tableKey: string,
  key: string,
  label: string,
  type: ScalarFieldType,
  hint: string,
): ColumnDef => ({
  id: `tpl-${typeSlug}-f-${slug(tableKey)}-c-${slug(key)}`,
  key,
  label,
  type,
  required: false,
  hint,
  examples: [],
})

const invoiceActions: FieldAction[] = [
  {
    kind: 'check',
    id: 'tpl-invoice-a-gross-check',
    label: 'Gross = Net + VAT',
    left: { kind: 'field', fieldId: 'tpl-invoice-f-gross-total' },
    op: 'eq',
    right: {
      kind: 'call',
      fn: 'add',
      args: [
        { kind: 'field', fieldId: 'tpl-invoice-f-net-total' },
        { kind: 'field', fieldId: 'tpl-invoice-f-vat-total' },
      ],
    },
    tolerance: 0.01,
    severity: 'warning',
  },
  {
    kind: 'check',
    id: 'tpl-invoice-a-net-check',
    label: 'Net = sum of line nets',
    left: { kind: 'field', fieldId: 'tpl-invoice-f-net-total' },
    op: 'eq',
    right: {
      kind: 'call',
      fn: 'sum',
      args: [{ kind: 'column', fieldId: 'tpl-invoice-f-line-items', columnId: 'tpl-invoice-f-line-items-c-net' }],
    },
    tolerance: 0.01,
    severity: 'warning',
  },
  {
    kind: 'compute',
    id: 'tpl-invoice-a-payment-term',
    fieldId: 'tpl-invoice-f-payment-term-days',
    expr: {
      kind: 'call',
      fn: 'days_between',
      args: [
        { kind: 'field', fieldId: 'tpl-invoice-f-issue-date' },
        { kind: 'field', fieldId: 'tpl-invoice-f-due-date' },
      ],
    },
  },
]

const invoice = ((): DocumentTemplate => {
  const t = 'invoice'
  const f = (
    key: string,
    label: string,
    type: ScalarFieldType,
    hint: string,
    opts?: FieldOptions,
  ) => makeField(t, key, label, type, hint, opts)
  const c = (key: string, label: string, type: ScalarFieldType, hint: string) =>
    makeColumn(t, 'line_items', key, label, type, hint)

  return {
    id: 'tpl-invoice',
    name: 'Invoice',
    description:
      'A sales or purchase invoice issued by a supplier, with totals and line items.',
    fields: [
      f('supplier_name', 'Supplier', 'text', 'Name of the company that issued the invoice (the seller), not the buyer.', {
        required: true,
        groupable: true,
      }),
      f('supplier_tax_id', 'Supplier tax ID', 'tax_id', 'Tax ID of the seller (VAT ID, EIN, NIP … , as printed).'),
      f('invoice_number', 'Invoice number', 'text', 'The invoice number exactly as printed, for example FV/2026/05/123.', {
        required: true,
      }),
      f('issue_date', 'Issue date', 'date', 'Date the invoice was issued, usually labelled "Issue date" or "Invoice date".', {
        required: true,
      }),
      f('sale_date', 'Sale date', 'date', 'Date of sale or delivery, usually labelled "Data sprzedaży". Leave empty if absent.'),
      f('due_date', 'Due date', 'date', 'Payment deadline, usually labelled "Termin płatności".'),
      f('payment_term_days', 'Payment term (days)', 'number', 'Calculated from the issue and due dates.'),
      f('net_total', 'Net total', 'money', 'Total net amount (netto) of the whole invoice.', { required: true }),
      f('vat_total', 'VAT total', 'money', 'Total VAT amount of the whole invoice.'),
      f('gross_total', 'Gross total', 'money', 'Total gross amount (brutto) to be paid.', { required: true }),
      makeTable(t, 'line_items', 'Line items', 'One row per invoiced item or service.', [
        c('description', 'Description', 'text', 'Name or description of the item or service.'),
        c('quantity', 'Quantity', 'number', 'Number of units.'),
        c('unit', 'Unit', 'text', 'Unit of measure, for example szt., h, kg.'),
        c('unit_net', 'Unit net price', 'money', 'Net price of one unit.'),
        c('vat_rate', 'VAT rate', 'number', 'VAT rate in percent, for example 23. Use 0 for reverse charge or non-EU.'),
        c('net', 'Net', 'money', 'Net value of the row.'),
        c('vat', 'VAT', 'money', 'VAT amount of the row.'),
        c('gross', 'Gross', 'money', 'Gross value of the row.'),
      ]),
    ],
    actions: invoiceActions,
    titleFieldId: 'tpl-invoice-f-invoice-number',
    listColumnIds: [
      'tpl-invoice-f-supplier-name',
      'tpl-invoice-f-issue-date',
      'tpl-invoice-f-gross-total',
    ],
  }
})()

const receipt = ((): DocumentTemplate => {
  const t = 'receipt'
  const f = (
    key: string,
    label: string,
    type: ScalarFieldType,
    hint: string,
    opts?: FieldOptions,
  ) => makeField(t, key, label, type, hint, opts)
  const c = (key: string, label: string, type: ScalarFieldType, hint: string) =>
    makeColumn(t, 'items', key, label, type, hint)

  return {
    id: 'tpl-receipt',
    name: 'Receipt',
    description: 'A retail receipt or till slip (paragon) for a small purchase.',
    fields: [
      f('merchant', 'Merchant', 'text', 'Name of the shop or business that issued the receipt.', {
        required: true,
        groupable: true,
      }),
      f('merchant_tax_id', 'Merchant tax ID', 'tax_id', 'Tax ID of the merchant (VAT ID, EIN, NIP …, as printed), usually near the top.'),
      f('receipt_date', 'Date', 'date', 'Date of the purchase.', { required: true }),
      f('total', 'Total', 'money', 'Total amount paid, including tax.', { required: true }),
      f('tax_total', 'Tax total', 'money', 'Total tax (VAT) amount on the receipt.'),
      f('payment_method', 'Payment method', 'select', 'How the purchase was paid.', {
        options: ['Card', 'Cash', 'Transfer', 'Other'],
      }),
      makeTable(t, 'items', 'Items', 'One row per purchased item.', [
        c('description', 'Description', 'text', 'Name of the purchased item.'),
        c('quantity', 'Quantity', 'number', 'Number of units purchased.'),
        c('price', 'Price', 'money', 'Price of the row, including tax.'),
      ]),
    ],
    actions: [],
    titleFieldId: 'tpl-receipt-f-merchant',
    listColumnIds: [
      'tpl-receipt-f-receipt-date',
      'tpl-receipt-f-total',
      'tpl-receipt-f-payment-method',
    ],
  }
})()

const contract = ((): DocumentTemplate => {
  const pc = (key: string, label: string, type: ScalarFieldType, hint: string) =>
    makeColumn('contract', 'parties', key, label, type, hint)
  const f = (
    key: string,
    label: string,
    type: ScalarFieldType,
    hint: string,
    opts?: FieldOptions,
  ) => makeField('contract', key, label, type, hint, opts)

  return {
    id: 'tpl-contract',
    name: 'Contract',
    description: 'A contract or agreement between two or more parties, with term and value.',
    fields: [
      f('contract_number', 'Contract number', 'text', 'Contract number or reference, if the document has one.'),
      makeTable('contract', 'parties', 'Parties', 'One row per contracting party, including our own company.', [
        pc('name', 'Name', 'text', 'Full legal name of the party.'),
        pc('tax_id', 'Tax ID', 'tax_id', 'Tax ID of the party (VAT ID, EIN, NIP …, as printed).'),
      ]),
      f('counterparty', 'Counterparty', 'text', 'The other party to the contract (not our company).', {
        groupable: true,
      }),
      f('counterparty_tax_id', 'Counterparty tax ID', 'tax_id', 'Tax ID of the counterparty.'),
      f('counterparty_email', 'Counterparty email', 'email', 'Contact email of the counterparty.'),
      f('counterparty_phone', 'Counterparty phone', 'phone', 'Contact phone number of the counterparty.'),
      f('signing_date', 'Signing date', 'date', 'Date the contract was signed.', { required: true }),
      f('start_date', 'Start date', 'date', 'Date the contract takes effect.'),
      f('end_date', 'End date', 'date', 'Date the contract ends. Leave empty for indefinite contracts.'),
      f('value', 'Contract value', 'money', 'Total or periodic value of the contract, with its currency.'),
      f('auto_renewal', 'Auto-renewal', 'boolean', 'True if the contract renews automatically when it expires.'),
    ],
    actions: [],
    titleFieldId: 'tpl-contract-f-contract-number',
    listColumnIds: [
      'tpl-contract-f-counterparty',
      'tpl-contract-f-signing-date',
      'tpl-contract-f-end-date',
    ],
  }
})()

export const DOCUMENT_TEMPLATES: readonly DocumentTemplate[] = [invoice, receipt, contract]
