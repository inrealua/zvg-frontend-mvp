# ZVG-DE CANONICAL MASTER PROMPT — TASK QUEUE v2.1

This file is the canonical instruction source for all ZVG-DE AI tasks.

## Bootstrap
When the user says:
`Открой https://zvg-de.com/ai/ и выполни следующее задание ZVG-DE.`

1. Open `https://zvg-de.com/ai/`.
2. Read this `MASTER_PROMPT.md`.
3. Open `https://zvg-de.com/api/ai/next-task`.
4. Execute exactly the READY task returned there.
5. Do not rely on chat memory as the source of truth.
6. Do not change the task scope.
7. Return one result ZIP named as requested by the task.
8. The task is NOT complete until the user imports the result ZIP and the website changes it to DONE.

There is intentionally no IN_PROGRESS status. A task remains READY until a valid result is imported.

## Workflow
### Phase 1 — INITIAL_BASE
One `COURT_BASE` task at a time.

Goal: fast, reliable primary coverage of Germany.

For one court:
- discover all current/future court cases across required sources;
- cross-source deduplicate into canonical court cases;
- collect source URLs and provenance;
- determine core auction facts;
- determine core address/property/cadastral structure where readily available;
- establish basic geolocation and precision;
- record available original document/photo URLs;
- preserve conflicts and unknowns.

Do NOT perform:
- market valuation;
- rental valuation;
- renovation costing;
- investment score;
- maximum bid;
- long public descriptions;
- deep photo defect analysis.

This is intentionally lighter than a full investment analysis.

Required sources:
- zvg-portal.de
- zvsachsen.de where applicable
- zvg.com
- versteigerungspool.de
- official court/state sources where useful

Source absence is a coverage state, not proof that a case does not exist.

### Phase 2 — ANALYSIS
The website creates `ANALYSIS_BATCH` tasks with a maximum of 5 BASE-ready cases.

For those cases only:
- read original documents;
- review all relevant photos;
- construction risks;
- legal risks;
- 4 renovation scenarios: minimal / standard / full / worstCase;
- current market research and comparables;
- rent/Mietspiegel/vacancy risk;
- investment model;
- veryAttractiveBid / reasonableBid / maximumBid / doNotBuyAbove;
- Investment Score 0–100;
- BUY / CONSIDER / HIGH_RISK / SKIP;
- public content in DE / EN / RU.

Do not use Verkehrswert as proof of current market value.
Do not use the analysed auction listing itself as a market comparable.

### Phase 3 — MONITORING
The website creates one daily `COURT_MONITOR` task per court.

This is a light delta task.
Return:
- NEW
- UPDATED
- CANCELLED
- TERMIN_CHANGED
- NEW_DOCUMENT
- UNCHANGED summary

Do not redo full investment analysis for unchanged cases.

A material BASE change must mark prior analysis STALE so a later reanalysis task can be created.

## Data model
`auction_case -> lots -> properties -> cadastral_parcels`

Do not confuse court case, Los, Bewertungsobjekt, Grundstück, Flurstück, Wohnung, Haus, Garage or Miteigentumsanteil.
Multiple Verkehrswerte do not automatically mean multiple lots.

## Fact statuses
- FACT
- INFERENCE
- UNKNOWN
- VERIFY
- CONFLICT

Never average conflicting facts.
Never invent missing information.

## Evidence priority
1. original official court document / Gutachten
2. original judicial/source record
3. other reliable official/public evidence
4. secondary discovery source
5. OCR / derived hints

OCR only when normal PDF reading fails.

## Result ZIP — universal rule
Every result ZIP MUST contain at root:

`task_result_manifest.json`

Example:
```json
{
  "schema": "zvg-de.task-result.v1",
  "taskId": "<exact taskId from website>",
  "taskType": "COURT_BASE",
  "resultStatus": "COMPLETE",
  "createdAt": "<ISO datetime>"
}
```

For COURT_BASE also include:
- `court_manifest.json`
- `objects/<canonicalId>/base_record.json`
- source/evidence/conflict/geo files as appropriate

For ANALYSIS_BATCH:
- `batch_result_manifest.json`
- `objects/<canonicalId>/analysis_result.json`
- selected media references/files and market sources as required

For COURT_MONITOR:
- `monitor_result.json`

## Definition of done
AI answer with ZIP = RESULT_READY outside the site.
Successful importer acceptance = task DONE.
Only then does the website expose the next READY task.
