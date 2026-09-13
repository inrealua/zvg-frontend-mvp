# zvg-de.com final result model v3 — quality profile

Stable key: `canonicalId`.

Public languages: `de`, `ru`, `en` only.

Core groups:

```text
canonicalId
publicationStatus
analysisVersion / analyzedAt / marketResearchedAt
primarySource / sources / documents
content.de / content.ru / content.en
localizedFields.de / localizedFields.ru / localizedFields.en
auction
property
lots
cadastral
media
market
renovation
constructionRisks
legalRisks
unknownsToVerify
investment
evidence
enrichment
confidence
warnings
qualityGate
```

## Shared vs localized data
Store numeric/identifier facts once where practical. Any short text that is visible to users and could otherwise remain in German must also have localized output in `localizedFields`.

Example:

```json
{
  "property": {
    "propertyTypeCode": "SINGLE_FAMILY_HOUSE",
    "livingAreaSqm": 125
  },
  "localizedFields": {
    "de": {"propertyType": "Einfamilienhaus"},
    "ru": {"propertyType": "Односемейный жилой дом"},
    "en": {"propertyType": "Single-family house"}
  }
}
```

## Market audit trail
`market` should contain:
- low/base/high value ranges
- comparables[]
- official/local market data when used
- excludedSubjectListings[] without URL or price
- valuationMethod
- confidence

A comparable should preserve enough metadata to understand why it was used and how it influenced value.

## Evidence
Evidence should identify the field/conclusion, source and precise locator (PDF page(s) or URL) whenever available.

## Media
`media.heroPhoto` and every `media.gallery[]` path must physically exist in the returned ZIP. Hero must not be duplicated in gallery. Prefer unique useful source images and extracted original PDF photos when necessary.

## Documents
Relevant original source documents should be copied unchanged to `documents/original/` and referenced in `documents[]`.

## Enrichment
When RAW source information is sparse, record external research in `enrichment` and keep unverifiable points in `unknownsToVerify`.

## Quality gate
The result must contain a `qualityGate` self-audit. Local receiver validation may reject obvious quality failures even if `qualityGate.passed=true`.
