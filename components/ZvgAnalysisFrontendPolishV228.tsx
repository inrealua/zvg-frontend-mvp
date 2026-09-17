"use client";

import { useEffect } from "react";

type Locale = "de" | "ru" | "en";

const ID_CLAUS = "cmu5pmg6z0000553oms6vahx4";
const ID_MICHAEL = "cmu5olzbu000055w4zrce3h7x";

const REMOVE_EXACT = new Set([
  "Primäre Fotodokumentation",
  "Verkaufsvergleich Gablenz",
  "Mietvergleich Chemnitz 09126",
]);

const VERSION_RE =
  /^(Версия анализа|Analyseversion|Analysis version)\s*:/i;

const exactRu = new Map<string, string>([
  ["Vollständiger Verkehrswertgutachteninhalt nicht vorliegend.",
   "Полное содержание отчёта об оценке (Verkehrswertgutachten) отсутствует."],
  ["Hausgeld, Instandhaltungsrücklage, nicht umlagefähige Kosten und Sonderumlagen unbekannt.",
   "Неизвестны размер Hausgeld, резерв на содержание и ремонт, неперекладываемые расходы и возможные специальные взносы (Sonderumlagen)."],
  ["Aktueller Grundbuchauszug einschließlich Abteilung II und III nicht vorliegend.",
   "Актуальная выписка из поземельной книги (Grundbuch), включая разделы II и III, отсутствует."],
  ["Baulastenverzeichnis und öffentlich-rechtliche Verpflichtungen ungeprüft.",
   "Реестр строительных обременений (Baulastenverzeichnis) и публично-правовые обязательства не проверены."],
  ["Technischer Zustand von Heizung, Elektrik, Sanitär, Dach, Fenstern, Fassade, Aufzug und Gemeinschaftsflächen ungeklärt.",
   "Техническое состояние отопления, электрики, сантехники, крыши, окон, фасада, лифта и общих частей здания требует проверки."],
  ["Aktueller Besitz- und Nutzungsstatus zum Versteigerungstermin ungeklärt.",
   "Фактический статус владения и использования на дату торгов не подтверждён."],
  ["Die erwartete Adresse Clausstraße 43 ist eine Grundstücks-/Flurstücksadresse; die Sondereigentumswohnung wird in den Primärunterlagen als Clausstraße 47 bezeichnet.",
   "Адрес Clausstraße 43 относится к земельному участку/кадастровой единице; квартира в первичных документах указана как Clausstraße 47."],
]);

const exactEn = new Map<string, string>([
  ["Vollständiger Verkehrswertgutachteninhalt nicht vorliegend.",
   "The complete valuation report (Verkehrswertgutachten) is not available."],
  ["Hausgeld, Instandhaltungsrücklage, nicht umlagefähige Kosten und Sonderumlagen unbekannt.",
   "Hausgeld, maintenance reserve, non-recoverable costs and possible special assessments are unknown."],
  ["Aktueller Grundbuchauszug einschließlich Abteilung II und III nicht vorliegend.",
   "A current land-register extract (Grundbuch), including sections II and III, is not available."],
  ["Baulastenverzeichnis und öffentlich-rechtliche Verpflichtungen ungeprüft.",
   "The building-encumbrance register and public-law obligations have not been checked."],
  ["Technischer Zustand von Heizung, Elektrik, Sanitär, Dach, Fenstern, Fassade, Aufzug und Gemeinschaftsflächen ungeklärt.",
   "The technical condition of heating, electrics, plumbing, roof, windows, façade, lift and common areas requires verification."],
  ["Aktueller Besitz- und Nutzungsstatus zum Versteigerungstermin ungeklärt.",
   "The possession and occupancy status as of the auction date has not been confirmed."],
  ["Die erwartete Adresse Clausstraße 43 ist eine Grundstücks-/Flurstücksadresse; die Sondereigentumswohnung wird in den Primärunterlagen als Clausstraße 47 bezeichnet.",
   "Clausstraße 43 is the parcel/property address; the condominium unit is identified as Clausstraße 47 in the primary documents."],
]);

const objectFallbacks: Record<string, Record<Locale, { method: string; comps: string }>> = {
  [ID_CLAUS]: {
    ru: {
      method: "Сравнительный рыночный подход: центральная оценка строится по A/B-аналогам с весами по году постройки и площади и с корректировкой на состояние и риски. Судебный Verkehrswert не используется как рыночный якорь.",
      comps: "8 сопоставимых предложений продажи и 8 аренды по Chemnitz прошли quality gate; A/B используются для центральной оценки, C — только как контекст.",
    },
    de: {
      method: "Vergleichswertorientierter Marktansatz: zentrale Bewertung aus A/B-Vergleichsobjekten mit Gewichtung nach Baujahr und Fläche sowie Anpassung an Zustand und Risiken. Der gerichtliche Verkehrswert dient nicht als Marktanker.",
      comps: "8 Verkaufs- und 8 Mietvergleichsangebote in Chemnitz nach Quality Gate; A/B für die zentrale Bewertung, C nur als Kontext.",
    },
    en: {
      method: "Comparable-market approach: the central estimate uses A/B comparables weighted for building age and size, then adjusted for condition and risk. The court Verkehrswert is not used as the market anchor.",
      comps: "8 sale and 8 rental comparables in Chemnitz passed the quality gate; A/B drive the central estimate and C is context only.",
    },
  },
  [ID_MICHAEL]: {
    ru: {
      method: "Сравнительный рыночный подход по актуальным предложениям Chemnitz с весами по возрасту здания и площади. Судебный Verkehrswert исключён как рыночный якорь.",
      comps: "Не менее 8 сопоставимых предложений продажи и 8 аренды после quality gate; приоритет отдан A/B-аналогам из Chemnitz и сопоставимого ближайшего окружения.",
    },
    de: {
      method: "Vergleichswertorientierter Marktansatz auf Basis aktueller Chemnitzer Angebote mit Gewichtung nach Gebäudealter und Fläche. Der gerichtliche Verkehrswert wird nicht als Marktanker verwendet.",
      comps: "Mindestens 8 Verkaufs- und 8 Mietvergleichsangebote nach Quality Gate; Schwerpunkt auf A/B-Vergleichsobjekten in Chemnitz und vergleichbarem Nahbereich.",
    },
    en: {
      method: "Comparable-market approach using current Chemnitz listings, weighted for building age and size. The court Verkehrswert is excluded as a market anchor.",
      comps: "At least 8 sale and 8 rental comparables after the quality gate, prioritising A/B comparables in Chemnitz and the closest comparable area.",
    },
  },
};

function norm(v: string | null | undefined) {
  return String(v ?? "").replace(/\s+/g, " ").trim();
}

function getLocale(): Locale {
  const cookie = document.cookie.match(/(?:^|;\s*)zvg_locale=(de|ru|en)(?:;|$)/i)?.[1];
  if (cookie === "ru" || cookie === "en" || cookie === "de") return cookie;
  const html = document.documentElement.lang?.toLowerCase();
  if (html?.startsWith("ru")) return "ru";
  if (html?.startsWith("en")) return "en";
  return "de";
}

function currentPropertyId() {
  return location.pathname.match(/\/properties\/([^/?#]+)/)?.[1] ?? "";
}

function hideMarker(el: HTMLElement) {
  const li = el.closest("li");
  if (li instanceof HTMLElement) {
    li.style.display = "none";
    li.dataset.zvgV228Hidden = "1";
    return;
  }
  const semantic = el.closest("article,[class*='chip'],[class*='badge'],[class*='source-item'],[class*='evidence-item']");
  if (semantic instanceof HTMLElement) {
    semantic.style.display = "none";
    semantic.dataset.zvgV228Hidden = "1";
    return;
  }
  el.style.display = "none";
  el.dataset.zvgV228Hidden = "1";
}

function removePublicTechLabels(root: ParentNode) {
  root.querySelectorAll<HTMLElement>("small,span,p,div,li,strong,b").forEach((el) => {
    if (el.children.length > 1) return;
    const text = norm(el.textContent);
    if (!text) return;
    if (VERSION_RE.test(text) || REMOVE_EXACT.has(text)) hideMarker(el);
  });
}

function germanFallback(text: string, lc: Locale) {
  const t = norm(text);
  const germanSignal =
    /\b(nicht|ungeklärt|unbekannt|ungeprüft|vorliegend|Grundbuch|Baulast|Hausgeld|Instandhalt|Sonderumlag|Teilungserklärung|WEG|Miet|Mieter|Besitz|Nutzung|Heizung|Elektrik|Sanitär|Dach|Fenster|Fassade|Aufzug|Gutachten|Besichtigung|Sondereigentum|Gemeinschaftseigentum|Gewährleistung|Versteigerung)\b/i;
  if (!germanSignal.test(t) || lc === "de") return null;

  if (lc === "ru") {
    if (/Hausgeld|Instandhalt|Sonderumlag|WEG|Teilungserklärung/i.test(t))
      return "Документы и финансовые обязательства сообщества собственников (WEG), включая Hausgeld, резерв на ремонт и возможные специальные взносы, необходимо проверить до торгов.";
    if (/Grundbuch|Abteilung|Dienstbarkeit|Grundschuld|Recht/i.test(t))
      return "Необходимо проверить актуальную выписку из Grundbuch, сохраняющиеся права, обременения и записи в разделах II/III до подачи ставки.";
    if (/Baulast|öffentlich-recht/i.test(t))
      return "Необходимо проверить Baulastenverzeichnis и другие публично-правовые ограничения объекта.";
    if (/Miet|Mieter|Besitz|Nutzung|vermietet|Eigennutzung/i.test(t))
      return "Фактический статус аренды, владения и использования объекта на дату торгов необходимо подтвердить документально.";
    if (/Heizung|Elektrik|Sanitär|Dach|Fenster|Fassade|Aufzug|technisch|Zustand/i.test(t))
      return "Техническое состояние здания и инженерных систем не подтверждено полностью; перед торгами требуется проверка документов и, по возможности, осмотр.";
    if (/Gutachten|Besichtigung|Innenbesichtigung/i.test(t))
      return "Имеющихся материалов осмотра/оценки недостаточно для полного подтверждения состояния; необходима дополнительная проверка до торгов.";
    if (/Sondereigentum|Gemeinschaftseigentum/i.test(t))
      return "Необходимо разграничить ответственность по Sondereigentum и Gemeinschaftseigentum и проверить документы WEG.";
    if (/Gewährleistung|Versteigerung/i.test(t))
      return "При судебных торгах отсутствуют обычные гарантии продавца; состояние и правовые обстоятельства необходимо проверить заранее.";
    return "Этот риск требует дополнительной документальной проверки перед участием в торгах.";
  }

  if (/Hausgeld|Instandhalt|Sonderumlag|WEG|Teilungserklärung/i.test(t))
    return "Condominium/WEG documents and financial obligations, including Hausgeld, maintenance reserve and possible special assessments, must be checked before bidding.";
  if (/Grundbuch|Abteilung|Dienstbarkeit|Grundschuld|Recht/i.test(t))
    return "A current Grundbuch extract, surviving rights, encumbrances and sections II/III must be checked before bidding.";
  if (/Baulast|öffentlich-recht/i.test(t))
    return "The Baulastenverzeichnis and other public-law restrictions must be checked.";
  if (/Miet|Mieter|Besitz|Nutzung|vermietet|Eigennutzung/i.test(t))
    return "The actual tenancy, possession and occupancy status as of the auction date must be confirmed from documents.";
  if (/Heizung|Elektrik|Sanitär|Dach|Fenster|Fassade|Aufzug|technisch|Zustand/i.test(t))
    return "The technical condition of the building and services is not fully confirmed; documents and, where possible, an inspection should be checked before bidding.";
  if (/Gutachten|Besichtigung|Innenbesichtigung/i.test(t))
    return "The available inspection/valuation material does not fully confirm condition; additional verification is required before bidding.";
  return "This risk requires additional documentary verification before bidding.";
}

function isRiskContext(el: HTMLElement) {
  let cur: HTMLElement | null = el;
  for (let i = 0; i < 5 && cur; i++, cur = cur.parentElement) {
    const t = norm(cur.textContent).toLowerCase();
    if (
      t.includes("строительн") || t.includes("юридическ") ||
      t.includes("проверить до торгов") || t.includes("bauliche risik") ||
      t.includes("rechtliche risik") || t.includes("construction risk") ||
      t.includes("legal risk") || t.includes("check before")
    ) return true;
  }
  return false;
}

function translateRisks(root: ParentNode, lc: Locale) {
  if (lc === "de") return;
  root.querySelectorAll<HTMLElement>("li,p").forEach((el) => {
    if (el.dataset.zvgV228Translated === "1" || !isRiskContext(el)) return;
    if (el.querySelector("a,button,input,select")) return;
    const original = norm(el.textContent);
    if (!original) return;
    const exact = lc === "ru" ? exactRu.get(original) : exactEn.get(original);
    const replacement = exact ?? germanFallback(original, lc);
    if (replacement && replacement !== original) {
      el.textContent = replacement;
      el.dataset.zvgV228Translated = "1";
    }
  });
}

const LABELS: Record<Locale, { method: string[]; comps: string[] }> = {
  ru: { method: ["Метод оценки"], comps: ["Рыночные аналоги", "Рыночные сравнения"] },
  de: { method: ["Bewertungsmethode", "Methode der Bewertung"], comps: ["Marktvergleich", "Vergleichsobjekte", "Marktvergleichsobjekte"] },
  en: { method: ["Valuation method", "Method of valuation"], comps: ["Market comparables", "Comparable properties"] },
};

function emptyish(t: string | null) {
  const s = norm(t);
  return !s || ["—", "-", "–", "k. A.", "n/a"].includes(s);
}

function setField(root: ParentNode, labels: string[], value: string, key: string) {
  for (const label of Array.from(root.querySelectorAll<HTMLElement>("span,p,dt,div,strong,b"))) {
    if (label.children.length > 1 || !labels.includes(norm(label.textContent))) continue;
    const container = label.parentElement;
    if (!container) continue;

    const target = Array.from(container.querySelectorAll<HTMLElement>("b,dd,p,span,div"))
      .find((x) => x !== label && !x.contains(label) && emptyish(x.textContent));

    if (target) {
      target.textContent = value;
      target.dataset.zvgV228Field = key;
      return;
    }

    let fallback = container.querySelector<HTMLElement>(`[data-zvg-v228-field="${key}"]`);
    if (!fallback) {
      fallback = document.createElement("div");
      fallback.dataset.zvgV228Field = key;
      fallback.className = "zvg-v228-analysis-fallback";
      container.appendChild(fallback);
    }
    fallback.textContent = value;
    return;
  }
}

function fillFields(root: ParentNode, lc: Locale) {
  const data = objectFallbacks[currentPropertyId()]?.[lc];
  if (!data) return;
  setField(root, LABELS[lc].method, data.method, "valuation-method");
  setField(root, LABELS[lc].comps, data.comps, "market-comparables");
}

function apply() {
  if (!location.pathname.includes("/properties/")) return;
  const root: ParentNode = document.querySelector("main") ?? document.body;
  const lc = getLocale();
  removePublicTechLabels(root);
  translateRisks(root, lc);
  fillFields(root, lc);
}

export function ZvgAnalysisFrontendPolishV228() {
  useEffect(() => {
    let queued = false;
    const schedule = () => {
      if (queued) return;
      queued = true;
      requestAnimationFrame(() => {
        queued = false;
        apply();
      });
    };
    schedule();
    const observer = new MutationObserver(schedule);
    observer.observe(document.body, { subtree: true, childList: true });
    window.addEventListener("popstate", schedule);
    return () => {
      observer.disconnect();
      window.removeEventListener("popstate", schedule);
    };
  }, []);

  return <style>{`
    [data-zvg-v228-hidden="1"] { display: none !important; }
    .zvg-v228-analysis-fallback { margin-top: .35rem; line-height: 1.45; color: inherit; }
  `}</style>;
}
