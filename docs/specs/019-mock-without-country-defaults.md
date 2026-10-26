# 019 — Mock data without country defaults

**Status:** draft · **Depends on:** — · **Route(s):** —

## Goal
The mock data and templates stop assuming Poland: the seed company defaults to USD, seed documents use mixed currencies with USD as the base, template hints are country-neutral, and money minor digits come from the currency instead of a hard-coded 2.

## Scope
- In: seed company (`defaultCurrency: 'USD'`, neutral names), seed documents and showcase sources, template hints (no "Data wystawienia" / NIP-only wording), one helper for minor digits per currency used by `formatMoney`, money input, export cells, the 016 registry (`round`) and builder constants/tolerance.
- Out: company locale and formats (spec 011).

## Data
`lib/mock/{data,documents-seed,showcase-sources,templates}.ts`; a new `lib/fields/currency-digits.ts`.

## Slices
To be split into slices at review.

## Backend needs
-

## Open questions
- From 009 / 016: money assumes 2 minor digits in several places.
- From the 016 review: the seed company still has `defaultCurrency: 'PLN'` and most seed documents are in PLN, against the "no country defaults" rule.

## Log
| Date | Slice | Result | Notes / files |
| --- | --- | --- | --- |
| 2026-10-26 | — | drafted | from the open questions of 009 / 016 |
