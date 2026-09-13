import { getI18n } from "@/lib/i18n/server";

type Locale = "de" | "ru" | "en";

type LocalizedText = Partial<Record<Locale, string>> | string | null | undefined;

type SourceItem = {
  label?: string;
  url?: string;
  role?: string;
  date?: string;
};

type AnalysisData = {
  schemaVersion?: string;
  officialValueEUR?: number | null;
  market?: {
    lowEUR?: number | null;
    highEUR?: number | null;
    midpointEUR?: number | null;
    confidence?: string;
    method?: LocalizedText;
    marketRentEurM2?: { low?: number | null; high?: number | null } | null;
    estimatedColdRentMonthlyEUR?: { low?: number | null; high?: number | null } | null;
  };
  renovation?: {
    lowEUR?: number | null;
    highEUR?: number | null;
    confidence?: string;
    basis?: LocalizedText;
    scenarios?: Array<{
      key?: string;
      label?: LocalizedText;
      lowEUR?: number | null;
      highEUR?: number | null;
      note?: LocalizedText;
    }>;
  };
  facts?: Array<{
    label?: LocalizedText;
    value?: LocalizedText;
    source?: string;
  }>;
  legalRisk?: {
    level?: string;
    items?: Partial<Record<Locale, string[]>>;
  };
  constructionRisk?: {
    level?: string;
    items?: Partial<Record<Locale, string[]>>;
  };
  positives?: Partial<Record<Locale, string[]>>;
  cautions?: Partial<Record<Locale, string[]>>;
  sources?: SourceItem[];
  disclaimer?: LocalizedText;
};

const copy = {
  de: {
    kicker: "ZVG-DE ANALYSE",
    title: "Investitions- & Risikoanalyse",
    official: "Gerichtlicher Verkehrswert",
    market: "ZVG-DE Marktwert (as-is)",
    renovation: "Vorläufiger Renovierungsrahmen",
    midpoint: "Mittelwert",
    confidence: "Konfidenz",
    rent: "Mietindikator",
    coldRent: "geschätzte Kaltmiete / Monat",
    facts: "Objekt-Fakten",
    legal: "Juristische Risiken",
    construction: "Bauliche Risiken",
    positives: "Positive Faktoren",
    cautions: "Besonders prüfen",
    scenarios: "Renovierungsszenarien",
    sources: "Quellen & Evidenz",
    methodology: "Methodik",
    source: "Quelle",
    risk: "Risiko",
    low: "niedrig",
    medium: "mittel",
    high: "hoch",
    veryHigh: "sehr hoch",
    veryLow: "sehr niedrig",
    notFormal: "Keine formelle Verkehrswertermittlung. Vor Gebot Gutachten, Grundbuch, Verfahrensakte und Zustand eigenständig prüfen.",
  },
  ru: {
    kicker: "АНАЛИЗ ZVG-DE",
    title: "Инвестиционный анализ и риски",
    official: "Судебный Verkehrswert",
    market: "Рыночная оценка ZVG-DE (as-is)",
    renovation: "Предварительный бюджет ремонта",
    midpoint: "Средняя точка",
    confidence: "Уверенность",
    rent: "Ориентир аренды",
    coldRent: "расчётная холодная аренда / месяц",
    facts: "Факты об объекте",
    legal: "Юридические риски",
    construction: "Строительные риски",
    positives: "Положительные факторы",
    cautions: "Что обязательно проверить",
    scenarios: "Сценарии ремонта",
    sources: "Источники и доказательная база",
    methodology: "Методика",
    source: "Источник",
    risk: "Риск",
    low: "низкий",
    medium: "средний",
    high: "высокий",
    veryHigh: "очень высокий",
    veryLow: "очень низкий",
    notFormal: "Это не официальная оценка Verkehrswert. Перед ставкой необходимо самостоятельно проверить Gutachten, Grundbuch, материалы дела и состояние объекта.",
  },
  en: {
    kicker: "ZVG-DE ANALYSIS",
    title: "Investment & risk analysis",
    official: "Court Verkehrswert",
    market: "ZVG-DE market estimate (as-is)",
    renovation: "Preliminary renovation allowance",
    midpoint: "Midpoint",
    confidence: "Confidence",
    rent: "Rent indicator",
    coldRent: "estimated cold rent / month",
    facts: "Property facts",
    legal: "Legal risks",
    construction: "Construction risks",
    positives: "Positive factors",
    cautions: "Priority checks",
    scenarios: "Renovation scenarios",
    sources: "Sources & evidence",
    methodology: "Methodology",
    source: "Source",
    risk: "Risk",
    low: "low",
    medium: "medium",
    high: "high",
    veryHigh: "very high",
    veryLow: "very low",
    notFormal: "This is not a formal valuation. Before bidding, independently verify the appraisal, land register, court file and physical condition.",
  },
} as const;

function asAnalysis(value: unknown): AnalysisData | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as AnalysisData;
}

function text(value: LocalizedText, locale: Locale): string {
  if (typeof value === "string") return value;
  if (!value || typeof value !== "object") return "";
  return value[locale] || value.de || value.en || value.ru || "";
}

function euro(value: number | null | undefined, locale: Locale): string {
  if (typeof value !== "number" || !Number.isFinite(value)) return "—";
  const tag = locale === "ru" ? "ru-RU" : locale === "en" ? "en-GB" : "de-DE";
  return new Intl.NumberFormat(tag, { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(value);
}

function number(value: number | null | undefined, locale: Locale, digits = 1): string {
  if (typeof value !== "number" || !Number.isFinite(value)) return "—";
  const tag = locale === "ru" ? "ru-RU" : locale === "en" ? "en-GB" : "de-DE";
  return new Intl.NumberFormat(tag, { maximumFractionDigits: digits }).format(value);
}

function range(low: number | null | undefined, high: number | null | undefined, locale: Locale): string {
  if (typeof low !== "number" && typeof high !== "number") return "—";
  if (typeof low === "number" && typeof high === "number") return `${euro(low, locale)} – ${euro(high, locale)}`;
  return euro((low ?? high) as number, locale);
}

function riskLabel(level: string | undefined, locale: Locale): string {
  const c = copy[locale];
  const normalized = String(level || "medium").toLowerCase().replace(/[_\s-]+/g, "");
  if (["low", "niedrig"].includes(normalized)) return c.low;
  if (["high", "hoch"].includes(normalized)) return c.high;
  if (["veryhigh", "sehrhoch"].includes(normalized)) return c.veryHigh;
  if (["verylow", "sehrniedrig"].includes(normalized)) return c.veryLow;
  return c.medium;
}

function riskClass(level: string | undefined): string {
  const normalized = String(level || "medium").toLowerCase().replace(/[_\s-]+/g, "");
  if (normalized.includes("veryhigh")) return "very-high";
  if (normalized.includes("high")) return "high";
  if (normalized.includes("verylow")) return "low";
  if (normalized.includes("low")) return "low";
  return "medium";
}

function localizedList(items: Partial<Record<Locale, string[]>> | undefined, locale: Locale): string[] {
  if (!items) return [];
  return items[locale] || items.de || items.en || items.ru || [];
}

export async function PropertyAnalysisPanel({ analysis }: { analysis: unknown }) {
  const data = asAnalysis(analysis);
  if (!data) return null;

  const { locale: rawLocale } = await getI18n();
  const locale: Locale = rawLocale === "ru" || rawLocale === "en" ? rawLocale : "de";
  const c = copy[locale];
  const legalItems = localizedList(data.legalRisk?.items, locale);
  const constructionItems = localizedList(data.constructionRisk?.items, locale);
  const positives = localizedList(data.positives, locale);
  const cautions = localizedList(data.cautions, locale);
  const method = text(data.market?.method, locale);
  const disclaimer = text(data.disclaimer, locale) || c.notFormal;

  return (
    <section className="zvg-analysis-panel" id="analysis">
      <div className="zvg-analysis-head">
        <div>
          <p className="zvg-analysis-kicker">{c.kicker}</p>
          <h2>{c.title}</h2>
        </div>
        <span className="zvg-analysis-version">{data.schemaVersion || "v1"}</span>
      </div>

      <div className="zvg-analysis-kpis">
        <article className="zvg-analysis-kpi court">
          <span>{c.official}</span>
          <strong>{euro(data.officialValueEUR, locale)}</strong>
        </article>
        <article className="zvg-analysis-kpi market">
          <span>{c.market}</span>
          <strong>{range(data.market?.lowEUR, data.market?.highEUR, locale)}</strong>
          {typeof data.market?.midpointEUR === "number" ? <small>{c.midpoint}: {euro(data.market.midpointEUR, locale)}</small> : null}
          <small>{c.confidence}: {riskLabel(data.market?.confidence, locale)}</small>
        </article>
        <article className="zvg-analysis-kpi renovation">
          <span>{c.renovation}</span>
          <strong>{range(data.renovation?.lowEUR, data.renovation?.highEUR, locale)}</strong>
          <small>{c.confidence}: {riskLabel(data.renovation?.confidence, locale)}</small>
        </article>
      </div>

      {(data.market?.marketRentEurM2 || data.market?.estimatedColdRentMonthlyEUR) ? (
        <div className="zvg-analysis-rentline">
          <b>{c.rent}</b>
          {data.market?.marketRentEurM2 ? (
            <span>{number(data.market.marketRentEurM2.low, locale, 2)}–{number(data.market.marketRentEurM2.high, locale, 2)} €/m²</span>
          ) : null}
          {data.market?.estimatedColdRentMonthlyEUR ? (
            <span>{c.coldRent}: {range(data.market.estimatedColdRentMonthlyEUR.low, data.market.estimatedColdRentMonthlyEUR.high, locale)}</span>
          ) : null}
        </div>
      ) : null}

      {method ? (
        <div className="zvg-analysis-method">
          <b>{c.methodology}</b>
          <p>{method}</p>
        </div>
      ) : null}

      {data.renovation?.scenarios?.length ? (
        <div className="zvg-analysis-block">
          <h3>{c.scenarios}</h3>
          <div className="zvg-renovation-grid">
            {data.renovation.scenarios.map((item, index) => (
              <article key={`${item.key || "scenario"}-${index}`}>
                <span>{text(item.label, locale) || item.key || `#${index + 1}`}</span>
                <strong>{range(item.lowEUR, item.highEUR, locale)}</strong>
                {text(item.note, locale) ? <p>{text(item.note, locale)}</p> : null}
              </article>
            ))}
          </div>
          {text(data.renovation.basis, locale) ? <p className="zvg-analysis-note">{text(data.renovation.basis, locale)}</p> : null}
        </div>
      ) : null}

      {data.facts?.length ? (
        <div className="zvg-analysis-block">
          <h3>{c.facts}</h3>
          <div className="zvg-facts-grid">
            {data.facts.map((fact, index) => (
              <div className="zvg-fact" key={`${text(fact.label, locale)}-${index}`}>
                <span>{text(fact.label, locale)}</span>
                <b>{text(fact.value, locale) || "—"}</b>
                {fact.source ? <small>{c.source}: {fact.source}</small> : null}
              </div>
            ))}
          </div>
        </div>
      ) : null}

      <div className="zvg-risk-grid">
        <article className="zvg-risk-card">
          <div className="zvg-risk-heading">
            <h3>{c.legal}</h3>
            <span className={`zvg-risk-badge ${riskClass(data.legalRisk?.level)}`}>{riskLabel(data.legalRisk?.level, locale)}</span>
          </div>
          {legalItems.length ? <ul>{legalItems.map((item, i) => <li key={i}>{item}</li>)}</ul> : <p>—</p>}
        </article>
        <article className="zvg-risk-card">
          <div className="zvg-risk-heading">
            <h3>{c.construction}</h3>
            <span className={`zvg-risk-badge ${riskClass(data.constructionRisk?.level)}`}>{riskLabel(data.constructionRisk?.level, locale)}</span>
          </div>
          {constructionItems.length ? <ul>{constructionItems.map((item, i) => <li key={i}>{item}</li>)}</ul> : <p>—</p>}
        </article>
      </div>

      {(positives.length || cautions.length) ? (
        <div className="zvg-signal-grid">
          {positives.length ? (
            <article className="zvg-signal-card positive">
              <h3>{c.positives}</h3>
              <ul>{positives.map((item, i) => <li key={i}>{item}</li>)}</ul>
            </article>
          ) : null}
          {cautions.length ? (
            <article className="zvg-signal-card caution">
              <h3>{c.cautions}</h3>
              <ul>{cautions.map((item, i) => <li key={i}>{item}</li>)}</ul>
            </article>
          ) : null}
        </div>
      ) : null}

      {data.sources?.length ? (
        <details className="zvg-analysis-sources">
          <summary>{c.sources} ({data.sources.length})</summary>
          <div className="zvg-source-list">
            {data.sources.map((source, index) => (
              <div className="zvg-source-row" key={`${source.url || source.label}-${index}`}>
                <div>
                  <b>{source.label || source.role || "Source"}</b>
                  {source.role ? <small>{source.role}</small> : null}
                  {source.date ? <small>{source.date}</small> : null}
                </div>
                {source.url ? <a href={source.url} target="_blank" rel="noreferrer">↗</a> : null}
              </div>
            ))}
          </div>
        </details>
      ) : null}

      <p className="zvg-analysis-disclaimer">{disclaimer}</p>
    </section>
  );
}
