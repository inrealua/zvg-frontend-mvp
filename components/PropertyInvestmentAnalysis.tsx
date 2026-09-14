// FINAL83_V8_UNIFIED_ANALYSIS
import type { Locale } from "@/lib/i18n/config";
import { formatEuro } from "@/lib/format";

type Translation = {
  recommendationSummary?: string | null;
  marketSummary?: string | null;
  renovationSummary?: string | null;
  riskSummary?: string | null;
  pros?: string[];
  cons?: string[];
  checksBeforeAuction?: string[];
};

type Props = {
  locale: Locale;
  translated: Translation;
  legacyAnalysis?: unknown;
  property: {
    analysisSchemaVersion?: string | null;
    analysisVersion?: string | null;
    marketValue?: number | null;
    primarySourcePortal?: string | null;
    primarySourceUrl?: string | null;
    officialVerkehrswertEur?: number | null;
    analyzedMarketValueLowEur?: number | null;
    analyzedMarketValueBaseEur?: number | null;
    analyzedMarketValueHighEur?: number | null;
    quickSale6mLowEur?: number | null;
    quickSale6mBaseEur?: number | null;
    quickSale6mHighEur?: number | null;
    rentMonthlyColdLowEur?: number | null;
    rentMonthlyColdBaseEur?: number | null;
    rentMonthlyColdHighEur?: number | null;
    renovationMinimalBaseEur?: number | null;
    renovationStandardBaseEur?: number | null;
    renovationFullBaseEur?: number | null;
    renovationWorstCaseBaseEur?: number | null;
    bidVeryAttractiveEur?: number | null;
    bidReasonableEur?: number | null;
    bidMaximumEur?: number | null;
    doNotBuyAboveEur?: number | null;
    investmentScore?: number | null;
    investmentRecommendation?: string | null;
    analysisConfidence?: string | null;
    constructionRisksJson?: unknown;
    legalRisksJson?: unknown;
    marketJson?: unknown;
    renovationJson?: unknown;
    investmentJson?: unknown;
    evidenceJson?: unknown;
    enrichmentJson?: unknown;
    qualityGateJson?: unknown;
    warningsJson?: unknown;
    unknownsToVerifyJson?: unknown;
    sourcesJson?: unknown;
  };
};

type RangeValue = { low?: number | null; base?: number | null; high?: number | null };

const labels = {
  de:{analysis:"Investmentanalyse",score:"Investment Score",confidence:"Konfidenz",version:"Analyseversion",market:"Unabhängige Markteinschätzung",official:"Gerichtlicher Verkehrswert",asIs:"Marktwert im Ist-Zustand",quick:"Schnellverkauf ~6 Monate",rent:"Kaltmiete / Monat",renovation:"Renovierung",minimal:"Minimal",standard:"Standard",full:"Komplett",worst:"Worst Case",details:"Kostenblöcke",bids:"Gebotsstrategie",attractive:"Sehr attraktiv",reasonable:"Sinnvoll",maximum:"Maximalgebot",stop:"Nicht kaufen über",construction:"Baurisiken",legal:"Rechtliche Risiken",verify:"Vor dem Gebot prüfen",pros:"Stärken",cons:"Schwächen",warnings:"Hinweise",comparables:"Marktvergleich",valuationMethod:"Bewertungsmethode",enrichment:"Zusatzrecherche",sources:"Quellen & Evidenz",source:"Quelle",open:"Öffnen",noRisks:"Keine strukturierten Risiken hinterlegt.",empty:"—",mitigation:"Finanzielle Folge",low:"niedrig",medium:"mittel",high:"hoch",includedBecause:"Warum verwendet",limitations:"Einschränkungen",adjustments:"Anpassungen",excludedSubject:"Eigene Marktanzeigen ausgeschlossen",evidence:"Beleglage",buy:"KAUF",consider:"PRÜFEN",highRisk:"HOHES RISIKO",skip:"NICHT KAUFEN"},
  ru:{analysis:"Инвестиционный анализ",score:"Инвестиционный рейтинг",confidence:"Уверенность",version:"Версия анализа",market:"Независимая оценка рынка",official:"Судебная оценочная стоимость",asIs:"Рыночная стоимость в текущем состоянии",quick:"Быстрая продажа ~6 месяцев",rent:"Холодная аренда / месяц",renovation:"Ремонт",minimal:"Минимальный",standard:"Стандартный",full:"Полный",worst:"Худший сценарий",details:"Статьи расходов",bids:"Стратегия ставки",attractive:"Очень выгодно",reasonable:"Разумная ставка",maximum:"Максимальная ставка",stop:"Не покупать выше",construction:"Строительные риски",legal:"Юридические риски",verify:"Проверить до торгов",pros:"Плюсы",cons:"Минусы",warnings:"Предупреждения",comparables:"Рыночные аналоги",valuationMethod:"Метод оценки",enrichment:"Дополнительное исследование",sources:"Источники и доказательства",source:"Источник",open:"Открыть",noRisks:"Структурированные риски не указаны.",empty:"—",mitigation:"Финансовое последствие",low:"низкий",medium:"средний",high:"высокий",includedBecause:"Почему использован",limitations:"Ограничения",adjustments:"Корректировки",excludedSubject:"Объявления самого объекта исключены",evidence:"Доказательная база",buy:"ПОКУПКА",consider:"РАССМОТРЕТЬ",highRisk:"ВЫСОКИЙ РИСК",skip:"НЕ ПОКУПАТЬ"},
  en:{analysis:"Investment analysis",score:"Investment score",confidence:"Confidence",version:"Analysis version",market:"Independent market assessment",official:"Official court valuation",asIs:"As-is market value",quick:"~6-month quick-sale value",rent:"Cold rent / month",renovation:"Renovation",minimal:"Minimal",standard:"Standard",full:"Full",worst:"Worst case",details:"Cost items",bids:"Bid strategy",attractive:"Very attractive",reasonable:"Reasonable bid",maximum:"Maximum bid",stop:"Do not buy above",construction:"Construction risks",legal:"Legal risks",verify:"Verify before bidding",pros:"Strengths",cons:"Weaknesses",warnings:"Warnings",comparables:"Market comparables",valuationMethod:"Valuation method",enrichment:"Additional research",sources:"Sources & evidence",source:"Source",open:"Open",noRisks:"No structured risks recorded.",empty:"—",mitigation:"Financial consequence",low:"low",medium:"medium",high:"high",includedBecause:"Why included",limitations:"Limitations",adjustments:"Adjustments",excludedSubject:"Subject-property listings excluded",evidence:"Evidence coverage",buy:"BUY",consider:"CONSIDER",highRisk:"HIGH RISK",skip:"SKIP"}
} as const;

function asArray(value: unknown): any[] { return Array.isArray(value) ? value : []; }
function asObject(value: unknown): Record<string, any> { return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, any> : {}; }
function localText(value: unknown, locale: Locale): string {
  if (typeof value === "string") return value;
  if (value && typeof value === "object") {
    const obj = value as Record<string, unknown>;
    const v = obj[locale] ?? obj.de ?? obj.ru ?? obj.en;
    return typeof v === "string" ? v : "";
  }
  return "";
}
function finite(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}
function firstNumber(...values: unknown[]): number | null {
  for (const value of values) { const n = finite(value); if (n !== null) return n; }
  return null;
}
function midpoint(low: number | null, high: number | null): number | null {
  return low !== null && high !== null ? Math.round((low + high) / 2) : low ?? high;
}
function range(low: unknown, base: unknown, high: unknown): RangeValue {
  return { low: finite(low), base: finite(base), high: finite(high) };
}
function hasRange(v: RangeValue): boolean { return v.low != null || v.base != null || v.high != null; }
function severityClass(value: unknown) { const s=String(value||"").toLowerCase(); if(s.includes("high")||s.includes("critical")||s.includes("hoch"))return"risk-high"; if(s.includes("medium")||s.includes("mittel"))return"risk-medium"; return"risk-low"; }
function severityLabel(value: unknown, locale: Locale) { const t=labels[locale]; const s=String(value||"").toLowerCase(); if(s.includes("high")||s.includes("critical")||s.includes("hoch"))return t.high; if(s.includes("medium")||s.includes("mittel"))return t.medium; return t.low; }
function moneyRange(cost: any) { if(!cost||typeof cost!=="object")return""; const low=firstNumber(cost.low,cost.costLowEur,cost.lowEUR),high=firstNumber(cost.high,cost.costHighEur,cost.highEUR,cost.base,cost.costBaseEur); if(low==null&&high==null)return""; if(low!=null&&high!=null)return`${formatEuro(low)} – ${formatEuro(high)}`; return formatEuro(low??high); }
function safeExternalUrl(value: unknown){const s=String(value||"");return /^https?:\/\//i.test(s)?s:""}
function listText(value: unknown, locale: Locale) { return asArray(value).map(x=>localText(x,locale)||String(x||"")).filter(Boolean); }
function localizedLegacyList(value: unknown, locale: Locale): string[] { const o=asObject(value); return listText(o[locale]??o.de??o.ru??o.en,locale); }
function rangeLabel(v: RangeValue){if(!hasRange(v))return"—";const b=v.base??midpoint(v.low??null,v.high??null);const r=v.low!=null&&v.high!=null?`${formatEuro(v.low)} – ${formatEuro(v.high)}`:"";return <><b>{formatEuro(b)}</b>{r?<small>{r}</small>:null}</>}

function normalizeRecommendation(value: unknown, locale: Locale): string {
  const raw=String(value||"").trim(); if(!raw)return "—";
  const u=raw.toUpperCase().replace(/[ -]+/g,"_"); const t=labels[locale];
  if(u.includes("HIGH_RISK")||u.includes("HIGHRI")||u.includes("HOHES_RISIKO"))return t.highRisk;
  if(u.includes("SKIP")||u.includes("DO_NOT_BUY")||u.includes("NICHT_KAUF")||u.includes("AVOID"))return t.skip;
  if(u.includes("CONSIDER")||u.includes("PRUEF")||u.includes("PRÜF"))return t.consider;
  if(u==="BUY"||u.startsWith("BUY_")||u.includes("KAUF"))return t.buy;
  return raw.length>28?`${raw.slice(0,27)}…`:raw;
}

function normalizeRiskRows(current: unknown, legacyRisk: Record<string, any>, locale: Locale): any[] {
  const rows=asArray(current); if(rows.length)return rows;
  const items=localizedLegacyList(legacyRisk.items,locale);
  return items.map((item)=>({title:item,severity:legacyRisk.level||"medium"}));
}
function RiskList({items,locale,empty}:{items:unknown;locale:Locale;empty:string}){const rows=asArray(items),t=labels[locale];if(!rows.length)return <p className="meta">{empty}</p>;return <div className="analysis-risk-list">{rows.map((r:any,i:number)=>{const isString=typeof r==="string";const title=isString?r:(localText(r?.title,locale)||localText(r?.summary,locale)||r?.category||`${locale==="de"?"Risiko":locale==="ru"?"Риск":"Risk"} ${i+1}`);const desc=isString?"":(localText(r?.description,locale)||localText(r?.basis,locale)||localText(r?.summary,locale));const verify=isString?"":(localText(r?.verifyAction,locale)||localText(r?.verify,locale));const cost=isString?null:(r?.costConsequence||r?.estimatedMitigationCostEur||r?.estimatedRemediationCostEur);const sev=isString?"medium":(r?.severity??r?.level);return <article className={`analysis-risk ${severityClass(sev)}`} key={`${r?.category||title}-${i}`}><div className="analysis-risk-head"><strong>{title}</strong><span>{severityLabel(sev,locale)}</span></div>{desc&&desc!==title?<p>{desc}</p>:null}{verify?<p className="meta"><b>{t.verify}:</b> {verify}</p>:null}{moneyRange(cost)?<p className="meta">{t.mitigation}: {moneyRange(cost)}</p>:null}</article>})}</div>}
function ListCard({title,items,empty}:{title:string;items:string[];empty:string}){return <div className="analysis-list"><h3>{title}</h3>{items.length?<ul>{items.map((x,i)=><li key={i}>{x}</li>)}</ul>:<p className="meta">{empty}</p>}</div>}
function scenarioRange(scenarios:any[], keys:string[]):RangeValue {
  const row=scenarios.find((x:any)=>{const key=String(x?.key??x?.name??x?.scenario??"").toLowerCase();return keys.some(k=>key.includes(k));});
  if(!row)return {};
  const low=firstNumber(row.lowEUR,row.low,row.costLowEur),high=firstNumber(row.highEUR,row.high,row.costHighEur),base=firstNumber(row.baseEUR,row.base,row.costBaseEur);
  return {low,base:base??midpoint(low,high),high};
}
function sourceRows(property:Props["property"], legacy:Record<string,any>):any[]{
  const rows=[...asArray(property.sourcesJson),...asArray(legacy.sources)];
  if(property.primarySourcePortal||property.primarySourceUrl)rows.unshift({label:property.primarySourcePortal||"Primary source",url:property.primarySourceUrl,role:"primary"});
  const seen=new Set<string>();return rows.filter((x:any)=>{const key=`${x?.url||""}|${x?.label||x?.portal||x?.title||""}`;if(seen.has(key))return false;seen.add(key);return Boolean(key.replace("|",""));}).slice(0,12);
}

export function PropertyInvestmentAnalysis({locale,translated,property,legacyAnalysis}:Props){
  const t=labels[locale],legacy=asObject(legacyAnalysis),legacyMarket=asObject(legacy.market),legacyRenovation=asObject(legacy.renovation),legacyInvestment=asObject(legacy.investment);
  const market=asObject(property.marketJson),renovation=asObject(property.renovationJson),investment=asObject(property.investmentJson),enrichment=asObject(property.enrichmentJson),quality=asObject(property.qualityGateJson);
  const legacyScenarios=asArray(legacyRenovation.scenarios);
  const currentScenarios=asArray(renovation.scenarios);
  const scenarios=currentScenarios.length?currentScenarios:legacyScenarios;

  const official=firstNumber(property.officialVerkehrswertEur,property.marketValue,legacy.officialValueEUR);
  const asIsLegacy=range(legacyMarket.lowEUR,legacyMarket.midpointEUR,legacyMarket.highEUR);
  const asIs=range(property.analyzedMarketValueLowEur,property.analyzedMarketValueBaseEur,property.analyzedMarketValueHighEur);
  if(!hasRange(asIs)&&hasRange(asIsLegacy))Object.assign(asIs,asIsLegacy);
  const quick=range(property.quickSale6mLowEur,property.quickSale6mBaseEur,property.quickSale6mHighEur);
  const legacyRentObj=asObject(legacyMarket.estimatedColdRentMonthlyEUR);
  const rent=range(property.rentMonthlyColdLowEur,property.rentMonthlyColdBaseEur,property.rentMonthlyColdHighEur);
  if(!hasRange(rent)){const lr=range(legacyRentObj.low,midpoint(finite(legacyRentObj.low),finite(legacyRentObj.high)),legacyRentObj.high);Object.assign(rent,lr);}

  const minimal=range(null,property.renovationMinimalBaseEur,null); if(!hasRange(minimal))Object.assign(minimal,scenarioRange(scenarios,["minimal","basic","cosmetic","leicht"]));
  const standard=range(null,property.renovationStandardBaseEur,null); if(!hasRange(standard))Object.assign(standard,scenarioRange(scenarios,["standard","medium","mittel"]));
  if(!hasRange(standard)){const low=finite(legacyRenovation.lowEUR),high=finite(legacyRenovation.highEUR);Object.assign(standard,{low,base:midpoint(low,high),high});}
  const full=range(null,property.renovationFullBaseEur,null); if(!hasRange(full))Object.assign(full,scenarioRange(scenarios,["full","complete","voll","kern"]));
  const worst=range(null,property.renovationWorstCaseBaseEur,null); if(!hasRange(worst))Object.assign(worst,scenarioRange(scenarios,["worst","maximum","max"]));

  const comparables=asArray(market.comparables);
  const lineItems=asArray(renovation.lineItems);
  const excluded=asArray(market.excludedSubjectListings);
  const evidence=asArray(property.evidenceJson);
  const unknowns=asArray(property.unknownsToVerifyJson);
  const constructionRisks=normalizeRiskRows(property.constructionRisksJson,asObject(legacy.constructionRisk),locale);
  const legalRisks=normalizeRiskRows(property.legalRisksJson,asObject(legacy.legalRisk),locale);
  const pros=translated.pros?.length?translated.pros:localizedLegacyList(legacy.positives,locale);
  const cons=translated.cons?.length?translated.cons:[];
  const legacyChecks=localizedLegacyList(legacy.cautions,locale);
  const checks=translated.checksBeforeAuction?.length?translated.checksBeforeAuction:(unknowns.length?unknowns.map((x:any)=>localText(x?.item,locale)||localText(x,locale)||String(x?.item||x||"")).filter(Boolean):legacyChecks);
  const warnings=asArray(property.warningsJson).map(x=>localText(x,locale)||String(x||"")).filter(Boolean);
  const sources=sourceRows(property,legacy);
  const version=property.analysisVersion||property.analysisSchemaVersion||String(legacy.schemaVersion||"")||"—";
  const recommendation=normalizeRecommendation(property.investmentRecommendation??investment.recommendation??investment.decision??legacyInvestment.recommendation,locale);
  const method=localText(market.valuationMethod,locale)||localText(market.methodology,locale)||localText(legacyMarket.method,locale)||String(market.methodology||"");
  const has=Boolean(property.analysisVersion||property.analysisSchemaVersion||Object.keys(legacy).length||property.investmentScore!=null||hasRange(asIs)||property.bidMaximumEur!=null||constructionRisks.length||legalRisks.length); if(!has)return null;

  return <section className="panel investment-analysis" id="analysis">
    <div className="analysis-heading"><div><p className="eyebrow">ZVG-DE · ANALYSIS</p><h2>{t.analysis}</h2><p className="meta">{t.version}: {version}</p></div><div className="analysis-score"><span>{t.score}</span><strong>{property.investmentScore??"—"}/100</strong><b>{recommendation}</b></div></div>
    {translated.recommendationSummary?<p className="analysis-lead">{translated.recommendationSummary}</p>:null}

    <h3>{t.market}</h3>
    <div className="analysis-kpis"><div><span>{t.official}</span><b>{formatEuro(official)}</b></div><div><span>{t.asIs}</span>{rangeLabel(asIs)}</div><div><span>{t.quick}</span>{rangeLabel(quick)}</div><div><span>{t.rent}</span>{rangeLabel(rent)}</div></div>
    {translated.marketSummary?<p className="description analysis-summary">{translated.marketSummary}</p>:null}
    <div className="analysis-detail-block"><h3>{t.valuationMethod}</h3><p>{method||t.empty}</p></div>
    <div className="analysis-detail-block"><h3>{t.comparables}</h3>{comparables.length?<div className="analysis-source-list">{comparables.slice(0,10).map((c:any,i:number)=>{const url=safeExternalUrl(c?.url);const title=c?.location||c?.title||c?.provider||c?.domain||t.source;const price=c?.askingPriceEur??c?.priceEur;const incl=localText(c?.whyIncluded,locale)||localText(c?.includedBecause,locale);const lim=localText(c?.limitations,locale)||localText(c?.caveat,locale);const adjustments=listText(c?.adjustments,locale);return <div className="analysis-source-row analysis-source-rich" key={`${title}-${i}`}><div><strong>{title}</strong>{Number.isFinite(Number(price))?<small>{formatEuro(Number(price))}{c?.areaSqm?` · ${c.areaSqm} m²`:""}</small>:null}{incl?<small><b>{t.includedBecause}:</b> {incl}</small>:null}{adjustments.length?<small><b>{t.adjustments}:</b> {adjustments.join("; ")}</small>:null}{lim?<small><b>{t.limitations}:</b> {lim}</small>:null}</div>{url?<a className="btn btn-soft" href={url} target="_blank" rel="noreferrer">{t.open}</a>:null}</div>})}</div>:<p className="meta">{t.empty}</p>}</div>
    {excluded.length?<p className="meta analysis-excluded">{t.excludedSubject}: {excluded.length}</p>:null}

    <h3>{t.renovation}</h3>
    <div className="analysis-kpis four"><div><span>{t.minimal}</span>{rangeLabel(minimal)}</div><div><span>{t.standard}</span>{rangeLabel(standard)}</div><div><span>{t.full}</span>{rangeLabel(full)}</div><div><span>{t.worst}</span>{rangeLabel(worst)}</div></div>
    {translated.renovationSummary?<p className="description analysis-summary">{translated.renovationSummary}</p>:null}
    <div className="analysis-detail-block"><h3>{t.details}</h3>{lineItems.length?<div className="analysis-line-items">{lineItems.map((item:any,i:number)=><div key={i}><span>{localText(item.label,locale)||item.category||`#${i+1}`}</span><b>{moneyRange(item)||t.empty}</b>{localText(item.comment,locale)?<small>{localText(item.comment,locale)}</small>:null}</div>)}</div>:<p className="meta">{t.empty}</p>}</div>

    <h3>{t.bids}</h3>
    <div className="analysis-kpis four bid-grid"><div><span>{t.attractive}</span><b>{formatEuro(property.bidVeryAttractiveEur??null)}</b></div><div><span>{t.reasonable}</span><b>{formatEuro(property.bidReasonableEur??null)}</b></div><div><span>{t.maximum}</span><b>{formatEuro(property.bidMaximumEur??null)}</b></div><div className="stop"><span>{t.stop}</span><b>{formatEuro(property.doNotBuyAboveEur??null)}</b></div></div>

    <div className="analysis-two-col"><div><h3>{t.construction}</h3><RiskList items={constructionRisks} locale={locale} empty={t.noRisks}/></div><div><h3>{t.legal}</h3><RiskList items={legalRisks} locale={locale} empty={t.noRisks}/></div></div>
    {translated.riskSummary?<p className="description analysis-summary">{translated.riskSummary}</p>:null}
    <div className="analysis-three-col"><ListCard title={t.pros} items={pros||[]} empty={t.empty}/><ListCard title={t.cons} items={cons||[]} empty={t.empty}/><ListCard title={t.verify} items={checks||[]} empty={t.empty}/></div>

    <div className="analysis-detail-block"><h3>{t.sources}</h3>{sources.length?<div className="analysis-source-list">{sources.map((s:any,i:number)=>{const url=safeExternalUrl(s?.url);const title=s?.label||s?.portal||s?.title||s?.domain||t.source;return <div className="analysis-source-row" key={`${title}-${i}`}><div><strong>{title}</strong>{s?.role?<small>{String(s.role)}</small>:null}{s?.date?<small>{String(s.date)}</small>:null}</div>{url?<a className="btn btn-soft" href={url} target="_blank" rel="noreferrer">{t.open}</a>:null}</div>})}</div>:<p className="meta">{t.empty}</p>}</div>
    {(enrichment.performed||asArray(enrichment.sources).length)?<div className="analysis-detail-block"><h3>{t.enrichment}</h3><p className="meta">{enrichment.sourceCompleteness?`${String(enrichment.sourceCompleteness).toUpperCase()} · `:""}{asArray(enrichment.sources).length} source(s)</p>{asArray(enrichment.factsAdded).length?<ul>{asArray(enrichment.factsAdded).slice(0,8).map((x:any,i:number)=><li key={i}>{localText(x,locale)||localText(x?.fact,locale)||String(x?.fact||x||"")}</li>)}</ul>:null}</div>:null}
    <p className="meta">{t.evidence}: {evidence.length||"—"} · {t.confidence}: {property.analysisConfidence||legacyMarket.confidence||"—"}{quality.passed===true?" · Quality Gate ✓":""}</p>
    {warnings.length?<div className="warning-box"><b>{t.warnings}</b><ul>{warnings.map((x,i)=><li key={i}>{x}</li>)}</ul></div>:null}
  </section>;
}
