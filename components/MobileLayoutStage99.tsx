"use client";

import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";

function clearOldClasses() {
  document.querySelectorAll<HTMLElement>(
    ".mobile-filter-panel-v99,.mobile-map-panel-v99,.mobile-map-actions-v99,.mobile-sort-row-v99,.mobile-property-grid-v99"
  ).forEach((el) => {
    el.classList.remove(
      "mobile-filter-panel-v99",
      "mobile-map-panel-v99",
      "mobile-map-actions-v99",
      "mobile-sort-row-v99",
      "mobile-property-grid-v99",
    );
  });
}

function scoreFilter(el: HTMLElement) {
  const text = el.innerText || "";
  let score = 0;
  if (/Suche|Поиск|Search/.test(text)) score += 2;
  if (/Ergebnisse anzeigen|Показать результаты|Show results/.test(text)) score += 3;
  if (/Filter zurücksetzen|Сбросить фильтр|Reset filter/.test(text)) score += 3;
  if (el.querySelector("input")) score += 1;
  if (el.querySelector("select")) score += 1;
  if (el.querySelector(".leaflet-container")) score -= 20;
  const rect = el.getBoundingClientRect();
  if (rect.height > 120 && rect.height < 900) score += 1;
  return score;
}

function markFilter() {
  const candidates = Array.from(document.querySelectorAll<HTMLElement>("main form, main section, main div"));
  const best = candidates
    .map((el) => ({ el, score: scoreFilter(el) }))
    .filter((item) => item.score >= 6)
    .sort((a, b) => b.score - a.score || a.el.getBoundingClientRect().height - b.el.getBoundingClientRect().height)[0];

  best?.el.classList.add("mobile-filter-panel-v99");
}

function markMap() {
  const leaflet = document.querySelector<HTMLElement>(".leaflet-container");
  if (!leaflet) return;

  let panel: HTMLElement | null = leaflet.parentElement;

  while (panel && panel !== document.body) {
    const text = panel.innerText || "";
    const rect = panel.getBoundingClientRect();

    if (/Karte|Карта|Map/.test(text) && rect.height > 250) break;
    panel = panel.parentElement;
  }

  if (!panel || panel === document.body) panel = leaflet.parentElement;

  panel?.classList.add("mobile-map-panel-v99");

  if (panel) {
    const actionCandidates = Array.from(panel.querySelectorAll<HTMLElement>("div, section"));
    const action = actionCandidates.find((el) => {
      const text = el.innerText || "";
      const hasButton = Boolean(el.querySelector("button, a"));
      const rect = el.getBoundingClientRect();
      return hasButton && /Kartenausschnitt|Region|области карты|область|map area|Draw/.test(text) && rect.height < 180;
    });

    action?.classList.add("mobile-map-actions-v99");
  }

  // Trigger Leaflet reflow after class changes.
  window.dispatchEvent(new Event("resize"));

  setTimeout(() => window.dispatchEvent(new Event("resize")), 120);
  setTimeout(() => window.dispatchEvent(new Event("resize")), 500);
}

function markSortAndCards() {
  const nodes = Array.from(document.querySelectorAll<HTMLElement>("main section, main div"));

  nodes.forEach((el) => {
    const text = el.innerText || "";
    const rect = el.getBoundingClientRect();

    if (/Sortierung|Сортировка|Sorting/.test(text) && /Zeigen|Показывать|per page|на стр/.test(text) && rect.height < 180) {
      el.classList.add("mobile-sort-row-v99");
    }

    if (el.querySelector('[href*="/properties/"]') && rect.height > 400 && !el.querySelector(".leaflet-container")) {
      const cardCount = el.querySelectorAll('[href*="/properties/"]').length;
      if (cardCount >= 2) el.classList.add("mobile-property-grid-v99");
    }
  });
}

function run() {
  clearOldClasses();
  markFilter();
  markMap();
  markSortAndCards();
}

export function MobileLayoutStage99() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    run();
    const timers = [100, 300, 700, 1300, 2200].map((ms) => window.setTimeout(run, ms));

    const onResize = () => run();
    window.addEventListener("resize", onResize);
    window.addEventListener("orientationchange", onResize);

    return () => {
      timers.forEach((timer) => window.clearTimeout(timer));
      window.removeEventListener("resize", onResize);
      window.removeEventListener("orientationchange", onResize);
    };
  }, [pathname, searchParams?.toString()]);

  return null;
}
