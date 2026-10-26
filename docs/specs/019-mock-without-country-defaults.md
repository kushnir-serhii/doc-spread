# 019 — Mock data without country defaults

**Status:** done · **Depends on:** — · **Route(s):** —

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

### [x] 1. Minor digits per currency
- **Build:** `minorDigits(currency)` from `Intl.NumberFormat(undefined, { style: 'currency', currency }).resolvedOptions().maximumFractionDigits` (cached per currency), plus `toMajor(amount, currency)` / `toMinor(major, currency)`. Add `JPY` to `CURRENCIES`. Replace every hard-coded `/ 100`, `* 100`, `toFixed(2)` and `padStart(2, '0')` used for money with the helper: `formatMoney`, `money-input.tsx`, `parse-field-value.ts`, `export-cells.ts`, `lib/mock/api.ts`, `lib/mock/pages.ts`, `evaluate.ts` (constant display).
- **Files:** `src/lib/fields/currency-digits.ts`, `src/lib/mock/types.ts`, `src/lib/mock/format.ts`, `src/features/documents/fields/money-input.tsx`, `src/lib/fields/parse-field-value.ts`, `src/features/export/export-cells.ts`, `src/lib/mock/api.ts`, `src/lib/mock/pages.ts`, `src/lib/fields/evaluate.ts`
- **Accept:**
  - [x] `minorDigits('USD') === 2`, `minorDigits('JPY') === 0`; no money code outside the helper divides or multiplies by 100
  - [x] a JPY amount of `1500` shows as ¥1,500 (browser locale), is typed as `1500` in the money input and is exported as `1500` (no decimal point)
  - [x] JPY can be picked in every currency select; the money input's step follows the currency
  - [x] 2-digit currencies look and export exactly as before

### [x] 2. Builder money in major units, `round` by currency
- **Build:** money constants (`ActionExpr` with `type: 'money'`) and check tolerances for money are stored in major units (`12.5`, `0.01`) instead of minor units. The evaluator converts them to minor units once the shared currency is known (a constant with no known currency stays `currency_mismatch`, as today). The evaluator passes the shared currency to functions that need it, so `round(money, decimals)` uses that currency's digits instead of `MINOR_DECIMALS = 2`. Builder inputs (`const-input.tsx`, `action-form.ts`) keep the typed major-unit value as is. Migrate the template checks (`tolerance: 1` → `0.01`) and any seeded money constants.
- **Files:** `src/lib/mock/types.ts`, `src/lib/fields/evaluate.ts`, `src/lib/fields/functions.ts`, `src/features/document-types/actions/const-input.tsx`, `src/features/document-types/actions/action-form.ts`, `src/lib/mock/templates.ts`
- **Accept:**
  - [x] the type comments say money constants and money tolerances are in major units of the document's currency
  - [x] "Gross = Net + VAT" with tolerance `0.01` passes on a USD document off by 1 cent and on a JPY document off by 0 yen, and fails on a JPY document off by 1 yen
  - [x] `round(x, 0)` on 12.50 USD gives 13.00 USD; on JPY it leaves the amount unchanged; `round(x, -2)` on 1,250 JPY gives 1,300 JPY
  - [x] a constant `5` added to a USD amount adds $5.00, to a JPY amount ¥5
  - [x] the live preview in the builder and the checks in Review show the same results as before for the existing seed data

### [x] 3. Neutral seed company and mixed-currency seed documents
- **Build:** the seed company becomes a neutral international one (e.g. "Northwind Studio Ltd", a generic tax ID, English-named team, accountant on a non-country domain) with `defaultCurrency: 'USD'`. `app-shell.tsx` stops hard-coding "Nordwind Trading Sp. z o.o." and shows the same name (through the existing company query, or a shared constant if the shell has no query yet; say which). Seed documents: USD is the most common currency, then EUR, GBP, PLN and a few JPY; add a Japanese supplier with JPY; receipts are no longer forced to PLN; `CZ` no longer maps to EUR (use a currency in `CURRENCIES`, or EUR with a comment saying it is a sample choice); the fallback is `DEFAULT_CURRENCY`, never `'PLN'`. VAT rates follow the supplier's country as today.
- **Decided:** "Northwind Studio Ltd", tax ID `TX-4821-0937`, team Alex Morgan (owner), Sam Rivera, Jordan Lee, Priya Shah on `northwind-studio.example`, accountant `accounting@ledgerworks.example`. The shell reads the name through `useCompany()` (it exists in `lib/api/company.ts`); the placeholder user becomes Alex Morgan. `CZ` → EUR with a "sample choice" comment (no CZK). Receipts take the supplier's country currency like invoices, and their tax uses that country's VAT rate instead of the hard-coded 23/123.
- **Files:** `src/lib/mock/data.ts`, `src/lib/mock/documents-seed.ts`, `src/components/layout/app-shell.tsx`
- **Accept:**
  - [x] no `'PLN'` literal is used as a default or fallback anywhere in `src/` (it remains only as a currency in `CURRENCIES` and on PL sample suppliers)
  - [x] Inbox shows documents in USD, EUR, GBP, PLN and JPY, with USD the largest group
  - [x] the dev seed check (`findValueMismatches`) logs nothing; failed-check seed documents (029, 030) still fail as before
  - [x] Export summary groups the totals per currency correctly, including JPY

### [x] 4. Showcase invoice and receipt in English and USD
- **Build:** rewrite `generate-mock-files.py` so `sample-invoice.pdf` and `sample-receipt.jpg` are an English invoice and receipt in USD (neutral supplier and merchant, a US/EU-style tax ID, no "Faktura", "NIP", "zł"). Regenerate the files, their `*.tokens.json` and `showcase-sources.ts`, and update `showcaseInvoiceValues` / `showcaseReceiptValues` so the values match what is printed. `sample-long.pdf` follows the same rules if it is Polish.
- **Decided:** a US supplier (e.g. "Brightline Software Inc.", EIN `84-1234567`) with an 8% sales tax printed per line ("Tax 8%"), which maps to the VAT fields; the receipt is a neutral café in USD with 8% tax. The KSeF line is not printed (the field goes in slice 5).
- **Files:** `apps/web/scripts/generate-mock-files.py`, `apps/web/public/mock/*`, `src/lib/mock/showcase-sources.ts`, `src/lib/mock/documents-seed.ts`
- **Model:** sonnet
- **Accept:**
  - [x] the showcase invoice and receipt open in the viewer in English, in USD, and every field's highlight box lands on its printed value
  - [x] the values in Review equal the printed ones (totals, line items, tax), and the Invoice checks pass on the showcase invoice
  - [x] the script runs from a clean checkout with the steps written at its top, and its output is committed

### [x] 5. Country-neutral hints and leftovers
- **Build:** the Polish-only "In KSeF" field is removed from the Invoice template and the seed documents; template hints stop naming one country: tax ID hints say "Tax ID of the seller (VAT ID, EIN, NIP …, as printed)", the issue date hint has no "Data wystawienia". Fix the remaining Polish defaults in app code: the parse error hint "try 1 234,56 zł" becomes a currency-neutral example, design page samples use USD, comments in `types.ts` and `field-key.ts` use English examples. `fake-extract.ts` word list may mix languages but not only Polish.
- **Files:** `src/lib/mock/templates.ts`, `src/lib/fields/parse-field-value.ts`, `src/pages/design/design-page.tsx`, `src/pages/design/field-types-section.tsx`, `src/lib/mock/types.ts`, `src/features/document-types/field-key.ts`, `src/lib/mock/fake-extract.ts`
- **Model:** haiku
- **Accept:**
  - [x] `grep -rniE "Data wystawienia|NIP for Polish|1 234,56 zł|pl-PL"` over `apps/web/src` finds nothing
  - [x] no `ksef` is left in `apps/web/src` or the generator script
  - [x] the design page shows USD samples; the parse hint names an amount with a currency code that isn't tied to a country (e.g. "1,234.56 USD")

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
- `evaluate.ts` shows a money constant with `toFixed(2)`, but a constant has no currency there.
  - **Decided:** slice 1 leaves it; slice 2 stores constants in major units, so it is shown as typed.
- The Invoice template has a Polish-only "In KSeF" field.
  - **Decided:** removed from the template and the seed documents (slice 5).
- From slice 1: `fake-extract.ts` picks a currency as `CURRENCIES[hash % length]`, so uploaded mock documents can now come out in JPY, with amounts generated at cent scale (e.g. ¥123,456). Harmless for a mock; left as is.
- From slice 2: a money constant with more decimals than its currency (`0.005` on USD) is rounded to a whole minor unit when it gets the currency; a tolerance with more decimals (`0.001` on USD) is compared as typed, so it is stricter than one cent. Both are fine as is.
- From slice 3: invoice line descriptions, units (`szt.`, `usł.` …) and number prefixes (`FV/`, `UMO/`, `ZAM/`) are still Polish, so the new US and JP invoices carry Polish line text. The scope allows Polish line descriptions as sample content; translating or picking them per country is left for a follow-up.

## Log
| Date | Slice | Result | Notes / files |
| --- | --- | --- | --- |
| 2026-10-26 | — | drafted | from the open questions of 009 / 016 |
| 2026-10-26 | — | ready | questions decided, split into 5 slices |
| 2026-10-26 | — | questions | seed company, CZ/receipt currency, showcase tax, KSeF removal decided |
| 2026-10-26 | 1 | done | `currency-digits.ts` (`minorDigits`, `toMajor`, `toMinor`, `majorText`), JPY in `CURRENCIES` and the parser (`¥`); format, money input (step / inputMode by currency), parse, export cells, mock text output. `evaluate.ts` constant display left for slice 2 |
| 2026-10-26 | 2 | done | money constants and tolerances in major units; a currency-less money scalar holds major units until `shareCurrency` converts it; money results rounded to whole minor units in the evaluator once the currency is known; `round` gets the call's currency; money tolerance compared on the major-unit difference; template tolerances `0.01`. Seed check results identical before / after. Files: `evaluate.ts`, `functions.ts`, `const-input.tsx`, `action-form.ts`, `types.ts`, `templates.ts` |
| 2026-10-26 | 3 | done | Northwind Studio Ltd (USD), English team; shell name from `useCompany()` (skeleton while loading, hidden if unknown); Japanese supplier (JPY) and Vercel (USD) added; merchants carry a country, receipts take its currency and VAT; file stems in English; receipt items in English. Typed documents: USD 9, PLN 5, EUR 3, JPY 3, GBP 2; no seed mismatches; check outcomes unchanged (029/030 still fail). Files: `data.ts`, `documents-seed.ts`, `app-shell.tsx`, `header.tsx` |
| 2026-10-26 | 4 | done | showcase invoice: Brightline Software Inc. (EIN) to Northwind Studio Ltd, 4 lines at 8% tax, 3,447.00 + 275.76 = 3,722.76 USD; receipt: Maple Corner Cafe, 42.74 USD incl. 3.17 tax; long sample in English. Every source box checked against its tokens; no seed mismatches; both Invoice checks pass on doc-001. No KSeF line printed (`ksef: false` without a source until slice 5). Files: `generate-mock-files.py`, `public/mock/*`, `showcase-sources.ts`, `documents-seed.ts` |
| 2026-10-26 | 5 | done | "In KSeF" removed from the Invoice template and seeds; tax ID / issue date hints country-neutral; parse hint "1,234.56 USD"; design page samples in USD via `formatMoney`; English comment examples; mixed `fake-extract` words. Seed re-checked: no mismatches, only 029/030 fail; typed documents USD 11, EUR 3, PLN 3, JPY 3, GBP 2. Files: `templates.ts`, `documents-seed.ts`, `parse-field-value.ts`, `design-page.tsx`, `field-types-section.tsx`, `types.ts`, `field-key.ts`, `fake-extract.ts` |
| 2026-10-26 | — | done | all slices done; typecheck, lint, build green |
