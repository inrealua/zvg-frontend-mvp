"use client";

import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";

type Locale = "de" | "ru" | "en";

function locale(): Locale {
  const first = window.location.pathname.split("/").filter(Boolean)[0];
  if (first === "ru" || first === "en" || first === "de") return first;
  return "de";
}

const labels = {
  de: {
    removed: "Weggefallen",
    activeLimits: "Gelten",
    statusActive: "Aktuell",
    statusCancelled: "Aufgehoben",
    term2: "2. Termin",
    term3: "3. Termin",
  },
  ru: {
    removed: "Сняты",
    activeLimits: "Действуют",
    statusActive: "Актуальный",
    statusCancelled: "Отмененный",
    term2: "2-й термин",
    term3: "3-й термин",
  },
  en: {
    removed: "Removed",
    activeLimits: "Active",
    statusActive: "Current",
    statusCancelled: "Cancelled",
    term2: "2nd auction",
    term3: "3rd auction",
  },
} as const;

function replaceText(input: string, loc: Locale) {
  const l = labels[loc];
  let text = input;

  const pairs: Array<[RegExp, string]> = [
    [/не сняты\s*\/\s*неизвестно|nicht weggefallen\s*\/\s*unbekannt|not removed\s*\/\s*unknown/gi, l.activeLimits],
    [/\bweggefallen\b|\bremoved\b|\bсняты\b/gi, l.removed],
    [/Действуют|Gelten|Active limits|Value limits active|Price limits active/gi, l.activeLimits],

    [/\bACTIVE\b|\bАктивен\b|\bAktiv\b|\bCurrent\b|\bАктуальный\b/gi, l.statusActive],
    [/\bCANCELLED\b|\bCANCELED\b|\bОтменено\b|\bОтмененный\b|\bAufgehoben\b|\bCancelled\b/gi, l.statusCancelled],
  ];

  for (const [from, to] of pairs) {
    text = text.replace(from, to);
  }

  return text;
}

function fixTermTextAroundWertgrenzen() {
  /*
    Only textual correction. Real query/data normalization is handled by helper.
    This catches active filters/cards where both value limits removed and 1st term
    are visible together.
  */
  document.querySelectorAll<HTMLElement>("body *").forEach((el) => {
    if (!el.childNodes || el.childNodes.length !== 1) return;
    const node = el.childNodes[0];
    if (node.nodeType !== Node.TEXT_NODE) return;

    const before = node.textContent || "";
    const after = replaceText(before, locale());

    if (after !== before) {
      node.textContent = after;
    }
  });
}

export function Stage111LabelRuntime() {
  const pathname = usePathname();
  const search = useSearchParams();

  useEffect(() => {
    fixTermTextAroundWertgrenzen();
    const timers = [250, 800, 1800].map((ms) => window.setTimeout(fixTermTextAroundWertgrenzen, ms));

    return () => {
      for (const timer of timers) window.clearTimeout(timer);
    };
  }, [pathname, search?.toString()]);

  return null;
}
