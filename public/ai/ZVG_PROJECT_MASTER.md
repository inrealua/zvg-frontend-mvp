# ZVG-DE PROJECT MASTER v5.0.0

## Purpose
ZVG-DE is a court-by-court evidence collection, analysis and publication system for German judicial real-estate auctions.

## Source of truth
Chat history and model memory are NOT authoritative project specifications.
For every new task, read:
1. `/ai/project-policy.json`
2. `/ai/project-state.json`
3. `/ai/tasks.json`
4. the relevant `/ai/courts/<courtId>.json`
5. current JSON schemas under `/ai/schemas/`

## Canonical workflow
COURT_DISCOVERY -> COURT_BASE -> BASE_GATE -> ANALYSIS -> ANALYSIS_GATE -> IMPORT -> PUBLISHED

## Primary collector
ChatGPT is the primary collector for court-by-court discovery.
Local parsers may be used as auxiliary evidence, never as the sole source of truth.

## Required discovery sources
- zvg-portal.de
- zvsachsen.de
- zvg.com
- versteigerungspool.de

Additional official/public sources may be used when useful.

## Evidence hierarchy
1. Original court document / appraisal (Gutachten, Terminsbestimmung, official notice)
2. Original source record
3. Other reliable public evidence
4. Derived hints / normalizers / OCR

Never average conflicting facts. Preserve each claim and resolve it explicitly.

## Case model
auction_case -> lots -> properties -> cadastral_parcels

Do not confuse:
- Los
- Bewertungsobjekt
- Grundstück
- Flurstück
- Wohnung
- Haus
- Garage
- Miteigentumsanteil

Multiple Verkehrswerte do not automatically imply multiple lots.

## Fact statuses
- FACT: directly supported by evidence
- INFERENCE: reasoned conclusion, not explicitly stated
- UNKNOWN: insufficient information
- VERIFY: requires external/manual verification
- CONFLICT: reliable sources disagree

## BASE stage
The BASE stage establishes what is known.
It MUST NOT perform market valuation, rent valuation, renovation budgeting or investment recommendations.

For every court:
- find all relevant cases/auction dates;
- record source coverage;
- collect source URLs/records;
- collect original documents;
- collect original photos;
- deduplicate cross-source records into canonical cases;
- determine case/lot/property/parcel structure;
- extract factual characteristics with evidence;
- determine geolocation and precision;
- preserve conflicts and uncertainties;
- run BASE_GATE.

## Geolocation
Store:
- latitude
- longitude
- precision: house_number | parcel | street | locality | approximate | unknown
- method/source
- evidence/confidence
Do not publish a street centroid as an exact property location.

## BASE_GATE
PASS only when:
- required sources were checked;
- source coverage is recorded;
- canonical dedup is complete or unresolved conflicts are explicit;
- original documents/photos found are physically present in the package;
- important facts have evidence where available;
- unresolved structure issues are marked UNKNOWN/VERIFY;
- no silent conflict resolution occurred.

## ANALYSIS stage
Only after BASE_GATE:
- detailed description;
- photo-based condition review;
- construction risks;
- legal risks;
- four renovation scenarios: minimal, standard, full, worstCase;
- current market research and comparables;
- rent estimate and vacancy risk;
- investment model;
- veryAttractiveBid, reasonableBid, maximumBid, doNotBuyAbove;
- Investment Score 0-100;
- BUY / CONSIDER / HIGH_RISK / SKIP;
- public content in DE / EN / RU.

Do not use the analysed auction listing itself as a market comparable.
Do not use Verkehrswert as proof of current market value.

## Publication
Importer does not reinterpret facts.
Importer validates schemas/quality gates and upserts by stable identity.
Production writes remain separate from research/analysis.

## Change control
Every package records:
- projectVersion
- schemaVersion
- createdAt
- source/evidence hashes where feasible
Analysis records the input BASE hash.
If BASE changes materially, prior analysis becomes stale.

## Court-by-court operating mode
Initial build: complete one court at a time.
Later runs: incremental (NEW / UPDATED / CANCELLED / NEW_DOCUMENT / UNCHANGED).

## Safety rule
If information is not established, store UNKNOWN/VERIFY. Never invent it.
