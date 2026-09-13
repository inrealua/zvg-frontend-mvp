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
  property: {
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
  };
};

const labels = {
  de:{analysis:"Investmentanalyse",score:"Investment Score",confidence:"Konfidenz",market:"Unabhängige Markteinschätzung",official:"Gerichtlicher Verkehrswert",asIs:"Marktwert im Ist-Zustand",quick:"Schnellverkauf ~6 Monate",rent:"Kaltmiete / Monat",renovation:"Renovierung",minimal:"Minimal",standard:"Standard",full:"Komplett",worst:"Worst Case",details:"Kostenblöcke",bids:"Gebotsstrategie",attractive:"Sehr attraktiv",reasonable:"Sinnvoll",maximum:"Maximalgebot",stop:"Nicht kaufen über",construction:"Baurisiken",legal:"Rechtliche Risiken",verify:"Vor dem Gebot prüfen",pros:"Stärken",cons:"Schwächen",warnings:"Hinweise",comparables:"Marktvergleich",valuationMethod:"Bewertungsmethode",enrichment:"Zusatzrecherche",source:"Quelle",open:"Öffnen",noRisks:"Keine strukturierten Risiken hinterlegt.",mitigation:"Finanzielle Folge",low:"niedrig",medium:"mittel",high:"hoch",includedBecause:"Warum verwendet",limitations:"Einschränkungen",adjustments:"Anpassungen",excludedSubject:"Eigene Marktanzeigen ausgeschlossen",evidence:"Beleglage"},
  ru:{analysis:"Инвестиционный анализ",score:"Инвестиционный рейтинг",confidence:"Уверенность",market:"Независимая оценка рынка",official:"Судебная оценочная стоимость",asIs:"Рыночная стоимость в текущем состоянии",quick:"Быстрая продажа ~6 месяцев",rent:"Холодная аренда / месяц",renovation:"Ремонт",minimal:"Минимальный",standard:"Стандартный",full:"Полный",worst:"Худший сценарий",details:"Статьи расходов",bids:"Стратегия ставки",attractive:"Очень выгодно",reasonable:"Разумная ставка",maximum:"Максимальная ставка",stop:"Не покупать выше",construction:"Строительные риски",legal:"Юридические риски",verify:"Проверить до торгов",pros:"Плюсы",cons:"Минусы",warnings:"Предупреждения",comparables:"Рыночные аналоги",valuationMethod:"Метод оценки",enrichment:"Дополнительное исследование",source:"Источник",open:"Открыть",noRisks:"Структурированные риски не указаны.",mitigation:"Финансовое последствие",low:"низкий",medium:"средний",high:"высокий",includedBecause:"Почему использован",limitations:"Ограничения",adjustments:"Корректировки",excludedSubject:"Объявления самого объекта исключены",evidence:"Доказательная база"},
  en:{analysis:"Investment analysis",score:"Investment score",confidence:"Confidence",market:"Independent market assessment",official:"Official court valuation",asIs:"As-is market value",quick:"~6-month quick-sale value",rent:"Cold rent / month",renovation:"Renovation",minimal:"Minimal",standard:"Standard",full:"Full",worst:"Worst case",details:"Cost items",bids:"Bid strategy",attractive:"Very attractive",reasonable:"Reasonable bid",maximum:"Maximum bid",stop:"Do not buy above",construction:"Construction risks",legal:"Legal risks",verify:"Verify before bidding",pros:"Strengths",cons:"Weaknesses",warnings:"Warnings",comparables:"Market comparables",valuationMethod:"Valuation method",enrichment:"Additional research",source:"Source",open:"Open",noRisks:"No structured risks recorded.",mitigation:"Financial consequence",low:"low",medium:"medium",high:"high",includedBecause:"Why included",limitations:"Limitations",adjustments:"Adjustments",excludedSubject:"Subject-property listings excluded",evidence:"Evidence coverage"}
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
function severityClass(value: unknown) { const s=String(value||"").toLowerCase(); if(s.includes("high")||s.includes("critical"))return"risk-high"; if(s.includes("medium"))return"risk-medium"; return"risk-low"; }
function severityLabel(value: unknown, locale: Locale) { const t=labels[locale]; const s=String(value||"").toLowerCase(); if(s.includes("high")||s.includes("critical"))return t.high; if(s.includes("medium"))return t.medium; return t.low; }
function moneyRange(cost: any) { if(!cost||typeof cost!=="object")return""; const low=Number(cost.low??cost.costLowEur),high=Number(cost.high??cost.costHighEur??cost.base??cost.costBaseEur); if(!Number.isFinite(low)&&!Number.isFinite(high))return""; if(Number.isFinite(low)&&Number.isFinite(high))return`${formatEuro(low)} – ${formatEuro(high)}`; return formatEuro(Number.isFinite(low)?low:high); }
function safeExternalUrl(value: unknown){const s=String(value||"");return /^https?:\/\//i.test(s)?s:""}
function listText(value: unknown, locale: Locale) { return asArray(value).map(x=>localText(x,locale)||String(x||"")).filter(Boolean); }
function RiskList({items,locale,empty}:{items:unknown;locale:Locale;empty:string}){const rows=asArray(items),t=labels[locale];if(!rows.length)return <p className="meta">{empty}</p>;return <div className="analysis-risk-list">{rows.map((r:any,i:number)=>{const title=localText(r?.title,locale)||r?.category||`${locale==="de"?"Risiko":locale==="ru"?"Риск":"Risk"} ${i+1}`;const desc=localText(r?.description,locale)||localText(r?.basis,locale);const verify=localText(r?.verifyAction,locale)||localText(r?.verify,locale);const cost=r?.costConsequence||r?.estimatedMitigationCostEur||r?.estimatedRemediationCostEur;return <article className={`analysis-risk ${severityClass(r?.severity??r?.level)}`} key={`${r?.category||title}-${i}`}><div className="analysis-risk-head"><strong>{title}</strong><span>{severityLabel(r?.severity??r?.level,locale)}</span></div>{desc?<p>{desc}</p>:null}{verify?<p className="meta"><b>{t.verify}:</b> {verify}</p>:null}{moneyRange(cost)?<p className="meta">{t.mitigation}: {moneyRange(cost)}</p>:null}</article>})}</div>}
function MiniList({title,items}:{title:string;items?:string[]}){if(!items?.length)return null;return <div className="analysis-list"><h3>{title}</h3><ul>{items.map((x,i)=><li key={i}>{x}</li>)}</ul></div>}
function rangeLabel(low?:number|null,base?:number|null,high?:number|null){if(base==null&&low==null&&high==null)return"—";const b=formatEuro(base??null);const r=low!=null&&high!=null?`${formatEuro(low)} – ${formatEuro(high)}`:"";return <><b>{b}</b>{r?<small>{r}</small>:null}</>}

export function PropertyInvestmentAnalysis({locale,translated,property}:Props){
  const t=labels[locale],market=asObject(property.marketJson),renovation=asObject(property.renovationJson),investment=asObject(property.investmentJson),enrichment=asObject(property.enrichmentJson),quality=asObject(property.qualityGateJson);
  const comparables=asArray(market.comparables),lineItems=asArray(renovation.lineItems),excluded=asArray(market.excludedSubjectListings),evidence=asArray(property.evidenceJson),unknowns=asArray(property.unknownsToVerifyJson);
  const has=Boolean(property.investmentScore!=null||property.analyzedMarketValueBaseEur!=null||property.bidMaximumEur!=null||asArray(property.constructionRisksJson).length||asArray(property.legalRisksJson).length); if(!has)return null;
  const warnings=asArray(property.warningsJson).map(x=>localText(x,locale)||String(x||"")).filter(Boolean);
  return <section className="panel investment-analysis" id="analysis">
    <div className="analysis-heading"><div><p className="eyebrow">ZVG-DE AI · Quality v3</p><h2>{t.analysis}</h2></div><div className="analysis-score"><span>{t.score}</span><strong>{property.investmentScore??"—"}/100</strong><b>{property.investmentRecommendation||"—"}</b></div></div>
    {translated.recommendationSummary?<p className="analysis-lead">{translated.recommendationSummary}</p>:null}

    <h3>{t.market}</h3>
    <div className="analysis-kpis"><div><span>{t.official}</span><b>{formatEuro(property.officialVerkehrswertEur??null)}</b></div><div><span>{t.asIs}</span>{rangeLabel(property.analyzedMarketValueLowEur,property.analyzedMarketValueBaseEur,property.analyzedMarketValueHighEur)}</div><div><span>{t.quick}</span>{rangeLabel(property.quickSale6mLowEur,property.quickSale6mBaseEur,property.quickSale6mHighEur)}</div><div><span>{t.rent}</span>{rangeLabel(property.rentMonthlyColdLowEur,property.rentMonthlyColdBaseEur,property.rentMonthlyColdHighEur)}</div></div>
    {translated.marketSummary?<p className="description analysis-summary">{translated.marketSummary}</p>:null}
    {localText(market.valuationMethod,locale)||market.methodology?<div className="analysis-detail-block"><h3>{t.valuationMethod}</h3><p>{localText(market.valuationMethod,locale)||localText(market.methodology,locale)||String(market.methodology||"")}</p></div>:null}
    {comparables.length?<div className="analysis-detail-block"><h3>{t.comparables}</h3><div className="analysis-source-list">{comparables.slice(0,10).map((c:any,i:number)=>{const url=safeExternalUrl(c?.url);const title=c?.location||c?.title||c?.provider||c?.domain||t.source;const price=c?.askingPriceEur??c?.priceEur;const incl=localText(c?.whyIncluded,locale)||localText(c?.includedBecause,locale);const lim=localText(c?.limitations,locale)||localText(c?.caveat,locale);const adjustments=listText(c?.adjustments,locale);return <div className="analysis-source-row analysis-source-rich" key={`${title}-${i}`}><div><strong>{title}</strong>{Number.isFinite(Number(price))?<small>{formatEuro(Number(price))}{c?.areaSqm?` · ${c.areaSqm} m²`:""}</small>:null}{incl?<small><b>{t.includedBecause}:</b> {incl}</small>:null}{adjustments.length?<small><b>{t.adjustments}:</b> {adjustments.join("; ")}</small>:null}{lim?<small><b>{t.limitations}:</b> {lim}</small>:null}</div>{url?<a className="btn btn-soft" href={url} target="_blank" rel="noreferrer">{t.open}</a>:null}</div>})}</div></div>:null}
    {excluded.length?<p className="meta analysis-excluded">{t.excludedSubject}: {excluded.length}</p>:null}

    <h3>{t.renovation}</h3>
    <div className="analysis-kpis four"><div><span>{t.minimal}</span><b>{formatEuro(property.renovationMinimalBaseEur??null)}</b></div><div><span>{t.standard}</span><b>{formatEuro(property.renovationStandardBaseEur??null)}</b></div><div><span>{t.full}</span><b>{formatEuro(property.renovationFullBaseEur??null)}</b></div><div><span>{t.worst}</span><b>{formatEuro(property.renovationWorstCaseBaseEur??null)}</b></div></div>
    {translated.renovationSummary?<p className="description analysis-summary">{translated.renovationSummary}</p>:null}
    {lineItems.length?<div className="analysis-detail-block"><h3>{t.details}</h3><div className="analysis-line-items">{lineItems.map((item:any,i:number)=><div key={i}><span>{localText(item.label,locale)||item.category||`#${i+1}`}</span><b>{moneyRange(item)}</b>{localText(item.comment,locale)?<small>{localText(item.comment,locale)}</small>:null}</div>)}</div></div>:null}

    <h3>{t.bids}</h3>
    <div className="analysis-kpis four bid-grid"><div><span>{t.attractive}</span><b>{formatEuro(property.bidVeryAttractiveEur??null)}</b></div><div><span>{t.reasonable}</span><b>{formatEuro(property.bidReasonableEur??null)}</b></div><div><span>{t.maximum}</span><b>{formatEuro(property.bidMaximumEur??null)}</b></div><div className="stop"><span>{t.stop}</span><b>{formatEuro(property.doNotBuyAboveEur??null)}</b></div></div>

    <div className="analysis-two-col"><div><h3>{t.construction}</h3><RiskList items={property.constructionRisksJson} locale={locale} empty={t.noRisks}/></div><div><h3>{t.legal}</h3><RiskList items={property.legalRisksJson} locale={locale} empty={t.noRisks}/></div></div>
    {translated.riskSummary?<p className="description analysis-summary">{translated.riskSummary}</p>:null}
    <div className="analysis-three-col"><MiniList title={t.pros} items={translated.pros}/><MiniList title={t.cons} items={translated.cons}/><MiniList title={t.verify} items={translated.checksBeforeAuction?.length?translated.checksBeforeAuction:unknowns.map((x:any)=>localText(x?.item,locale)||String(x?.item||x||""))}/></div>

    {(enrichment.performed||asArray(enrichment.sources).length)?<div className="analysis-detail-block"><h3>{t.enrichment}</h3><p className="meta">{enrichment.sourceCompleteness?`${String(enrichment.sourceCompleteness).toUpperCase()} · `:""}{asArray(enrichment.sources).length} source(s)</p>{asArray(enrichment.factsAdded).length?<ul>{asArray(enrichment.factsAdded).slice(0,8).map((x:any,i:number)=><li key={i}>{localText(x,locale)||localText(x?.fact,locale)||String(x?.fact||x||"")}</li>)}</ul>:null}</div>:null}
    {evidence.length?<p className="meta">{t.evidence}: {evidence.length} · {t.confidence}: {property.analysisConfidence||"—"}{quality.passed===true?" · Quality Gate ✓":""}</p>:<p className="meta">{t.confidence}: {property.analysisConfidence||"—"}</p>}
    {warnings.length?<div className="warning-box"><b>{t.warnings}</b><ul>{warnings.map((x,i)=><li key={i}>{x}</li>)}</ul></div>:null}
  </section>;
}
