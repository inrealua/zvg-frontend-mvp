import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

function patchFile(rel, updater) {
  const file = path.join(root, rel);
  if (!fs.existsSync(file)) {
    console.log("skip missing", rel);
    return;
  }

  const before = fs.readFileSync(file, "utf8");
  const after = updater(before);

  if (after !== before) {
    fs.writeFileSync(file, after, "utf8");
    console.log("patched", rel);
  } else {
    console.log("unchanged", rel);
  }
}

/**
 * Stage 65:
 * The mixed rows look visually uneven because multiselect/details cells and normal input/select
 * cells have different inner structure. We group them by type:
 *
 * Row 1: Search / ZIP / Court
 * Row 2: State / City / Property type / Usage
 * Row 3: Radius / Price / Living area / Plot
 * Row 4: Auction from / Auction to / Status / Heritage
 * Row 5: Value limits / Auction no. / Show / Reset
 *
 * This is mostly component order + clean CSS override.
 */
patchFile("components/FilterBar.tsx", (s) => {
  const start = s.indexOf('<div className="search-filter-grid-v60">');
  const end = s.indexOf("</div>\n    </form>", start);

  if (start === -1 || end === -1) {
    console.log("Could not find search-filter-grid-v60 block. Only CSS patch will be applied.");
    return s;
  }

  const block = `<div className="search-filter-grid-v60">
        {/* Row 1: normal search fields */}
        <div className="field span-2">
          <label htmlFor="q">{t.search}</label>
          <input id="q" name="q" placeholder={t.searchPlaceholder} defaultValue={getInitialValue(searchParams, "q")} />
        </div>

        <div className="field span-1">
          <label htmlFor="postalCode">{t.postalCode}</label>
          <input id="postalCode" name="postalCode" placeholder={t.postalPlaceholder} defaultValue={getInitialValue(searchParams, "postalCode")} />
        </div>

        <div className="field span-1">
          <label htmlFor="court">{t.court}</label>
          <select id="court" name="court" defaultValue={getInitialValue(searchParams, "court")}>
            <option value="">{t.allCourts}</option>
            {courts.map((court) => <option key={court} value={court}>{court}</option>)}
          </select>
        </div>

        {/* Row 2: all multiselect fields */}
        <StateMultiSelect states={states} selected={getInitialValues(searchParams, "state")} locale={locale} />
        <CityMultiSelect cities={cities} selected={getInitialValues(searchParams, "city")} locale={locale} />
        <MultiSelectDropdown title={t.propertyType} name="typeGroup" options={PROPERTY_GROUP_OPTIONS} selected={getInitialValues(searchParams, "typeGroup")} emptyLabel={t.allTypes} locale={locale} />
        <MultiSelectDropdown title={t.usage} name="occupancy" options={OCCUPANCY_OPTIONS} selected={getInitialValues(searchParams, "occupancy")} emptyLabel={t.anyUsage} locale={locale} />

        {/* Row 3: sliders */}
        <SingleRange label={t.radius} name="radiusKm" max={RADIUS_MAX} step={10} defaultValue={getInitialValue(searchParams, "radiusKm")} suffix=" km" locale={locale} />
        <DualRange label={t.marketValue} minName="minPrice" maxName="maxPrice" max={PRICE_MAX} step={5000} minDefault={getInitialValue(searchParams, "minPrice")} maxDefault={getInitialValue(searchParams, "maxPrice")} suffix=" €" locale={locale} />
        <DualRange label={t.livingArea} minName="minLivingArea" maxName="maxLivingArea" max={AREA_MAX} step={5} minDefault={getInitialValue(searchParams, "minLivingArea")} maxDefault={getInitialValue(searchParams, "maxLivingArea")} suffix=" m²" locale={locale} />
        <DualRange label={t.plotArea} minName="minPlotArea" maxName="maxPlotArea" max={PLOT_MAX} step={50} minDefault={getInitialValue(searchParams, "minPlotArea")} maxDefault={getInitialValue(searchParams, "maxPlotArea")} suffix=" m²" locale={locale} />

        {/* Row 4: date/status filters */}
        <div className="field span-1">
          <label htmlFor="dateFrom">{t.dateFrom}</label>
          <input id="dateFrom" name="dateFrom" type="date" defaultValue={getInitialValue(searchParams, "dateFrom")} />
        </div>

        <div className="field span-1">
          <label htmlFor="dateTo">{t.dateTo}</label>
          <input id="dateTo" name="dateTo" type="date" defaultValue={getInitialValue(searchParams, "dateTo")} />
        </div>

        <div className="field span-1">
          <label htmlFor="status">{t.status}</label>
          <select id="status" name="status" defaultValue={getInitialValue(searchParams, "status")}>
            {STATUS_OPTIONS.map((option) => {
              const localized = localizeOption(option, locale);
              const label = localized.value ? localized.label : t.allCurrent;
              return <option key={localized.value} value={localized.value}>{label}</option>;
            })}
          </select>
        </div>

        <div className="field span-1">
          <label htmlFor="denkmalschutz">{t.heritage}</label>
          <select id="denkmalschutz" name="denkmalschutz" defaultValue={getInitialValue(searchParams, "denkmalschutz")}>
            {BOOLEAN_OPTIONS.map((option) => {
              const localized = localizeOption(option, locale);
              const label = localized.value ? localized.label : t.any;
              return <option key={localized.value} value={localized.value}>{label}</option>;
            })}
          </select>
        </div>

        {/* Row 5: value limits / attempt / actions */}
        <div className="field span-1">
          <label htmlFor="wertgrenzen">{t.valueLimits}</label>
          <select id="wertgrenzen" name="wertgrenzen" defaultValue={getInitialValue(searchParams, "wertgrenzen")}>
            {WERTGRENZEN_OPTIONS.map((option) => {
              const localized = localizeOption(option, locale);
              const label = localized.value ? localized.label : t.any;
              return <option key={localized.value} value={localized.value}>{label}</option>;
            })}
          </select>
        </div>

        <div className="field span-1">
          <label htmlFor="auctionAttempt">{t.attempt}</label>
          <select id="auctionAttempt" name="auctionAttempt" defaultValue={getInitialValue(searchParams, "auctionAttempt")}>
            {AUCTION_ATTEMPT_OPTIONS.map((option) => {
              const localized = localizeOption(option, locale);
              const label = localized.value ? localized.label : t.any;
              return <option key={localized.value} value={localized.value}>{label}</option>;
            })}
          </select>
        </div>

        <button type="submit" className="btn btn-primary filter-action-button-v60">{t.submit}</button>
        <button type="button" onClick={clearFilters} className="btn btn-ghost filter-action-button-v60">{t.resetFilters}</button>
      </div>`;

  return s.slice(0, start) + block + s.slice(end + "</div>".length);
});

patchFile("app/globals.css", (s) => {
  if (s.includes("/* Stage 65 group multiselect row */")) return s;

  return s + `

/* Stage 65 group multiselect row */

/*
  Final UX decision:
  Do not mix multiselect/details controls with normal inputs in the same row.
  Row 1: normal search fields.
  Row 2: multiselects.
  Row 3: sliders.
  Row 4: date/status.
  Row 5: actions.
*/

.search-filter-grid-v60,
.search-filter-grid-v59,
.search-filter-grid-v58 {
  display: grid !important;
  grid-template-columns: repeat(4, minmax(0, 1fr)) !important;
  gap: 12px !important;
  align-items: start !important;
  grid-auto-rows: auto !important;
}

.search-filter-v60 .span-2,
.search-filter-v59 .span-2,
.search-filter-v58 .span-2,
.search-filter-v60 .span-6,
.search-filter-v59 .span-6,
.search-filter-v58 .span-6 {
  grid-column: span 2 !important;
}

.search-filter-v60 .span-1,
.search-filter-v59 .span-1,
.search-filter-v58 .span-1 {
  grid-column: span 1 !important;
}

/* Normal fields: light old style */
.search-filter-v60 .field,
.search-filter-v59 .field,
.search-filter-v58 .field {
  display: flex !important;
  flex-direction: column !important;
  justify-content: flex-start !important;
  gap: 6px !important;
  min-height: 64px !important;
  height: auto !important;
  margin: 0 !important;
  padding: 0 !important;
  border: 0 !important;
  background: transparent !important;
  box-shadow: none !important;
}

.search-filter-v60 .field > label,
.search-filter-v59 .field > label,
.search-filter-v58 .field > label {
  margin: 0 !important;
  padding: 0 !important;
  font-size: 12px !important;
  line-height: 1.15 !important;
  font-weight: 800 !important;
  color: #5a6b84 !important;
  text-align: left !important;
}

.search-filter-v60 .field > input,
.search-filter-v60 .field > select,
.search-filter-v59 .field > input,
.search-filter-v59 .field > select,
.search-filter-v58 .field > input,
.search-filter-v58 .field > select {
  width: 100% !important;
  height: 46px !important;
  min-height: 46px !important;
  margin: 0 !important;
  padding: 0 14px !important;
  border: 1px solid rgba(47, 79, 62, 0.18) !important;
  border-radius: 14px !important;
  background: #fff !important;
  box-shadow: none !important;
  color: #0d3327 !important;
  font-size: 15px !important;
  font-weight: 500 !important;
  line-height: 1.2 !important;
  text-align: left !important;
}

.search-filter-v60 .field > input::placeholder,
.search-filter-v59 .field > input::placeholder,
.search-filter-v58 .field > input::placeholder {
  color: #6d7890 !important;
  font-weight: 400 !important;
}

/* Multiselect row: all the same, so any inherent details styling is no longer compared to inputs */
.search-filter-v60 .multi-filter-v60,
.search-filter-v59 .multi-filter-v59,
.search-filter-v58 .multi-filter-v58 {
  min-height: 64px !important;
  height: auto !important;
  margin: 0 !important;
  padding: 0 !important;
  position: relative !important;
}

.multi-filter-v60 summary,
.multi-filter-v59 summary,
.multi-filter-v58 summary {
  min-height: 64px !important;
  height: 64px !important;
  margin: 0 !important;
  padding: 8px 12px 9px !important;
  border: 1px solid rgba(47, 79, 62, 0.18) !important;
  border-radius: 14px !important;
  background: #fff !important;
  display: flex !important;
  flex-direction: column !important;
  justify-content: center !important;
  gap: 4px !important;
  box-sizing: border-box !important;
  list-style: none !important;
  box-shadow: none !important;
  text-align: left !important;
}

.multi-filter-v60 summary::-webkit-details-marker,
.multi-filter-v59 summary::-webkit-details-marker,
.multi-filter-v58 summary::-webkit-details-marker {
  display: none !important;
}

.multi-filter-v60 summary span,
.multi-filter-v59 summary span,
.multi-filter-v58 summary span {
  margin: 0 !important;
  padding: 0 !important;
  font-size: 12px !important;
  line-height: 1.15 !important;
  font-weight: 800 !important;
  color: #5a6b84 !important;
}

.multi-filter-v60 summary b,
.multi-filter-v59 summary b,
.multi-filter-v58 summary b {
  margin: 0 !important;
  padding: 0 !important;
  color: #0d3327 !important;
  font-size: 15px !important;
  font-weight: 700 !important;
  line-height: 1.2 !important;
}

/* Slider row: taller and consistent only with itself */
.search-filter-v60 .range-filter-v60,
.search-filter-v59 .range-filter-v59,
.search-filter-v58 .range-filter-v58 {
  min-height: 82px !important;
  height: 82px !important;
  margin: 0 !important;
  padding: 10px 14px 8px !important;
  border: 1px solid rgba(47, 79, 62, 0.16) !important;
  border-radius: 14px !important;
  background: #fff !important;
  box-sizing: border-box !important;
  overflow: hidden !important;
  box-shadow: none !important;
}

.range-title-v60,
.range-title-v59,
.range-title-v58 {
  display: flex !important;
  justify-content: space-between !important;
  align-items: baseline !important;
  gap: 8px !important;
  height: 17px !important;
  margin: 0 0 7px !important;
  padding: 0 !important;
}

.range-title-v60 span,
.range-title-v59 span,
.range-title-v58 span {
  font-size: 12px !important;
  line-height: 1.15 !important;
  font-weight: 800 !important;
  color: #5a6b84 !important;
}

.range-title-v60 b,
.range-title-v59 b,
.range-title-v58 b {
  font-size: 14px !important;
  line-height: 1.15 !important;
  font-weight: 700 !important;
  color: #0d3327 !important;
  white-space: nowrap !important;
}

.range-track-v60,
.range-track-v59,
.range-track-v58 {
  position: relative !important;
  height: 28px !important;
  margin: 0 !important;
  padding: 0 12px !important;
  box-sizing: border-box !important;
}

.range-track-v60::before,
.range-track-v59::before,
.range-track-v58::before {
  content: "" !important;
  position: absolute !important;
  left: 12px !important;
  right: 12px !important;
  top: 12px !important;
  height: 4px !important;
  border-radius: 999px !important;
  background: rgba(47, 79, 62, 0.14) !important;
}

.range-track-v60::after,
.range-track-v59::after,
.range-track-v58::after {
  content: "" !important;
  position: absolute !important;
  left: calc(12px + (100% - 24px) * var(--range-start, 0) / 100) !important;
  right: calc(12px + (100% - 24px) * (100 - var(--range-end, 100)) / 100) !important;
  top: 12px !important;
  height: 4px !important;
  border-radius: 999px !important;
  background: #2f604f !important;
}

.range-track-single-v60::after,
.range-track-single-v59::after,
.range-track-single-v58::after {
  left: 12px !important;
  right: calc(12px + (100% - 24px) * (100 - var(--range-end, 0)) / 100) !important;
}

.range-track-v60 input,
.range-track-v59 input,
.range-track-v58 input {
  position: absolute !important;
  inset: 0 !important;
  width: 100% !important;
  height: 28px !important;
  margin: 0 !important;
  appearance: none !important;
  background: transparent !important;
  pointer-events: none !important;
  z-index: 2 !important;
  border: 0 !important;
}

.range-track-v60 input::-webkit-slider-runnable-track,
.range-track-v59 input::-webkit-slider-runnable-track,
.range-track-v58 input::-webkit-slider-runnable-track {
  height: 28px !important;
  background: transparent !important;
  border: 0 !important;
}

.range-track-v60 input::-webkit-slider-thumb,
.range-track-v59 input::-webkit-slider-thumb,
.range-track-v58 input::-webkit-slider-thumb {
  appearance: none !important;
  pointer-events: auto !important;
  width: 22px !important;
  height: 22px !important;
  margin-top: 3px !important;
  border-radius: 999px !important;
  border: 4px solid #ffffff !important;
  background: #2f604f !important;
  box-shadow: 0 3px 10px rgba(17, 36, 27, 0.25) !important;
  cursor: grab !important;
}

.range-scale {
  height: 14px !important;
  margin-top: 1px !important;
  line-height: 1 !important;
  display: flex !important;
  align-items: flex-end !important;
  justify-content: space-between !important;
  font-size: 12px !important;
  font-weight: 700 !important;
  color: #5a6b84 !important;
  overflow: hidden !important;
}

/* Action buttons in one row with two action cells */
.filter-action-button-v60,
.filter-action-button-v59,
.filter-action-button-v58 {
  height: 64px !important;
  min-height: 64px !important;
  margin: 0 !important;
  padding: 0 18px !important;
  border-radius: 14px !important;
  align-self: start !important;
  box-sizing: border-box !important;
  font-size: 15px !important;
  font-weight: 800 !important;
}

.multi-filter-panel-v60,
.multi-filter-panel-v59,
.multi-filter-panel-v58 {
  position: absolute !important;
  z-index: 100 !important;
}

@media (max-width: 1100px) {
  .search-filter-grid-v60,
  .search-filter-grid-v59,
  .search-filter-grid-v58 {
    grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
  }

  .search-filter-v60 .span-2,
  .search-filter-v59 .span-2,
  .search-filter-v58 .span-2,
  .search-filter-v60 .span-6,
  .search-filter-v59 .span-6,
  .search-filter-v58 .span-6 {
    grid-column: span 2 !important;
  }
}

@media (max-width: 700px) {
  .search-filter-grid-v60,
  .search-filter-grid-v59,
  .search-filter-grid-v58 {
    grid-template-columns: 1fr !important;
  }

  .search-filter-v60 .span-2,
  .search-filter-v59 .span-2,
  .search-filter-v58 .span-2,
  .search-filter-v60 .span-6,
  .search-filter-v59 .span-6,
  .search-filter-v58 .span-6 {
    grid-column: span 1 !important;
  }

  .multi-filter-panel-v60,
  .multi-filter-panel-v59,
  .multi-filter-panel-v58 {
    position: static !important;
    margin-top: 8px !important;
  }
}
`;
});

console.log("Stage 65 patch completed.");
