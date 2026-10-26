# 019 — Mock data without country defaults

**Status:** ready · **Depends on:** — · **Route(s):** —

## Goal
The mock data and templates stop assuming Poland: the seed company is a neutral international one with USD as its default, seed documents use mixed currencies with USD the most common, the showcase files are in English and USD, template hints are country-neutral, and money minor digits come from the currency instead of a hard-coded 2.

## Scope
- In: one helper for minor digits per currency, used everywhere money is converted between minor and major units (formatting, money input, parsing, export cells, mock text output, the 016 `round` function, builder constants and tolerances); JPY as a 0-digit currency; the seed company, team and app-shell company name; seed documents; the showcase invoice and receipt (generator script, files, tokens, `showcase-sources.ts`); template hints; the remaining Polish leftovers in app code (parse hint, design page samples, comments).
- Out: company locale and formats (spec 011). Polish suppliers, merchants and line descriptions may stay as sample content among others; they are just not the default.

## Data
- `lib/fields/currency-digits.ts` (new): `minorDigits(currency)` and the conversions between minor and major units.
- `lib/mock/types.ts`: `CURRENCIES` gets `JPY`; `ActionExpr` money constants and check tolerances move to major units.
- `lib/mock/{data,documents-seed,showcase-sources,templates,format,api,pages}.ts`, `lib/fields/{functions,evaluate,parse-field-value}.ts`, `features/export/export-cells.ts`, `features/documents/fields/money-input.tsx`, `features/document-types/actions/{action-form.ts,const-input.tsx}`, `components/layout/app-shell.tsx`, `apps/web/scripts/generate-mock-files.py`, `apps/web/public/mock/sample-invoice.*`, `sample-receipt.*`.

## Slices

### [ ] 1. Minor digits per currency
- **Build:** `minorDigits(currency)` from `Intl.NumberFormat(undefined, { style: 'currency', currency }).resolvedOptions().maximumFractionDigits` (cached per currency), plus `toMajor(amount, currency)` / `toMinor(major, currency)`. Add `JPY` to `CURRENCIES`. Replace every hard-coded `/ 100`, `* 100`, `toFixed(2)` and `padStart(2, '0')` used for money with the helper: `formatMoney`, `money-input.tsx`, `parse-field-value.ts`, `export-cells.ts`, `lib/mock/api.ts`, `lib/mock/pages.ts`, `evaluate.ts` (constant display).
- **Files:** `src/lib/fields/currency-digits.ts`, `src/lib/mock/types.ts`, `src/lib/mock/format.ts`, `src/features/documents/fields/money-input.tsx`, `src/lib/fields/parse-field-value.ts`, `src/features/export/export-cells.ts`, `src/lib/mock/api.ts`, `src/lib/mock/pages.ts`, `src/lib/fields/evaluate.ts`
- **Accept:**
  - [ ] `minorDigits('USD') === 2`, `minorDigits('JPY') === 0`; no money code outside the helper divides or multiplies by 100
  - [ ] a JPY amount of `1500` shows as ¥1,500 (browser locale), is typed as `1500` in the money input and is exported as `1500` (no decimal point)
  - [ ] JPY can be picked in every currency select; the money input's step follows the currency
  - [ ] 2-digit currencies look and export exactly as before

### [ ] 2. Builder money in major units, `round` by currency
- **Build:** money constants (`ActionExpr` with `type: 'money'`) and check tolerances for money are stored in major units (`12.5`, `0.01`) instead of minor units. The evaluator converts them to minor units once the shared currency is known (a constant with no known currency stays `currency_mismatch`, as today). The evaluator passes the shared currency to functions that need it, so `round(money, decimals)` uses that currency's digits instead of `MINOR_DECIMALS = 2`. Builder inputs (`const-input.tsx`, `action-form.ts`) keep the typed major-unit value as is. Migrate the template checks (`tolerance: 1` → `0.01`) and any seeded money constants.
- **Files:** `src/lib/mock/types.ts`, `src/lib/fields/evaluate.ts`, `src/lib/fields/functions.ts`, `src/features/document-types/actions/const-input.tsx`, `src/features/document-types/actions/action-form.ts`, `src/lib/mock/templates.ts`
- **Accept:**
  - [ ] the type comments say money constants and money tolerances are in major units of the document's currency
  - [ ] "Gross = Net + VAT" with tolerance `0.01` passes on a USD document off by 1 cent and on a JPY document off by 0 yen, and fails on a JPY document off by 1 yen
  - [ ] `round(x, 0)` on 12.50 USD gives 13.00 USD; on JPY it leaves the amount unchanged; `round(x, -2)` on 1,250 JPY gives 1,300 JPY
  - [ ] a constant `5` added to a USD amount adds $5.00, to a JPY amount ¥5
  - [ ] the live preview in the builder and the checks in Review show the same results as before for the existing seed data

### [ ] 3. Neutral seed company and mixed-currency seed documents
- **Build:** the seed company becomes a neutral international one (e.g. "Northwind Studio Ltd", a generic tax ID, English-named team, accountant on a non-country domain) with `defaultCurrency: 'USD'`. `app-shell.tsx` stops hard-coding "Nordwind Trading Sp. z o.o." and shows the same name (through the existing company query, or a shared constant if the shell has no query yet; say which). Seed documents: USD is the most common currency, then EUR, GBP, PLN and a few JPY; add a Japanese supplier with JPY; receipts are no longer forced to PLN; `CZ` no longer maps to EUR (use a currency in `CURRENCIES`, or EUR with a comment saying it is a sample choice); the fallback is `DEFAULT_CURRENCY`, never `'PLN'`. VAT rates follow the supplier's country as today.
- **Files:** `src/lib/mock/data.ts`, `src/lib/mock/documents-seed.ts`, `src/components/layout/app-shell.tsx`
- **Accept:**
  - [ ] no `'PLN'` literal is used as a default or fallback anywhere in `src/` (it remains only as a currency in `CURRENCIES` and on PL sample suppliers)
  - [ ] Inbox shows documents in USD, EUR, GBP, PLN and JPY, with USD the largest group
  - [ ] the dev seed check (`findValueMismatches`) logs nothing; failed-check seed documents (029, 030) still fail as before
  - [ ] Export summary groups the totals per currency correctly, including JPY

### [ ] 4. Showcase invoice and receipt in English and USD
- **Build:** rewrite `generate-mock-files.py` so `sample-invoice.pdf` and `sample-receipt.jpg` are an English invoice and receipt in USD (neutral supplier and merchant, a US/EU-style tax ID, no "Faktura", "NIP", "zł"). Regenerate the files, their `*.tokens.json` and `showcase-sources.ts`, and update `showcaseInvoiceValues` / `showcaseReceiptValues` so the values match what is printed. `sample-long.pdf` follows the same rules if it is Polish.
- **Files:** `apps/web/scripts/generate-mock-files.py`, `apps/web/public/mock/*`, `src/lib/mock/showcase-sources.ts`, `src/lib/mock/documents-seed.ts`
- **Model:** sonnet
- **Accept:**
  - [ ] the showcase invoice and receipt open in the viewer in English, in USD, and every field's highlight box lands on its printed value
  - [ ] the values in Review equal the printed ones (totals, line items, tax), and the Invoice checks pass on the showcase invoice
  - [ ] the script runs from a clean checkout with the steps written at its top, and its output is committed

### [ ] 5. Country-neutral hints and leftovers
- **Build:** template hints stop naming one country: tax ID hints say "Tax ID of the seller (VAT ID, EIN, NIP …, as printed)", the issue date hint has no "Data wystawienia". Fix the remaining Polish defaults in app code: the parse error hint "try 1 234,56 zł" becomes a currency-neutral example, design page samples use USD, comments in `types.ts` and `field-key.ts` use English examples. `fake-extract.ts` word list may mix languages but not only Polish.
- **Files:** `src/lib/mock/templates.ts`, `src/lib/fields/parse-field-value.ts`, `src/pages/design/design-page.tsx`, `src/pages/design/field-types-section.tsx`, `src/lib/mock/types.ts`, `src/features/document-types/field-key.ts`, `src/lib/mock/fake-extract.ts`
- **Model:** haiku
- **Accept:**
  - [ ] `grep -rniE "Data wystawienia|NIP for Polish|1 234,56 zł|pl-PL"` over `apps/web/src` finds nothing
  - [ ] the design page shows USD samples; the parse hint names an amount with a currency code that isn't tied to a country (e.g. "1,234.56 USD")

## Backend needs
- Money constants and money tolerances in actions are stored in major units (decimal), not minor units; the backend converts with the currency's minor digits (ISO 4217) at evaluation.
- The currency list includes 0-digit currencies (JPY); amounts are integers in that currency's minor unit.

## Open questions
- From 009 / 016: money assumes 2 minor digits in several places.
  - **Decided:** one helper (`minorDigits`) from `Intl`; JPY added so a 0-digit currency is exercised (slice 1).
- Builder money constants, tolerances and `round` don't know their currency.
  - **Decided:** store them in major units; the evaluator converts with the shared currency and passes it to `round` (slice 2).
- From the 016 review: the seed company still has `defaultCurrency: 'PLN'` and most seed documents are in PLN, against the "no country defaults" rule.
  - **Decided:** a neutral international seed company with USD; the app shell shows its name; documents mixed with USD the most common (slice 3).
- The showcase files are Polish / PLN.
  - **Decided:** regenerate them in English and USD (slice 4).
- Polish leftovers outside the original scope (app-shell company name, parse hint, design page, `CZ → EUR`, receipts forced to PLN).
  - **Decided:** included (slices 3 and 5).

## Log
| Date | Slice | Result | Notes / files |
| --- | --- | --- | --- |
| 2026-10-26 | — | drafted | from the open questions of 009 / 016 |
| 2026-10-26 | — | ready | questions decided, split into 5 slices |
