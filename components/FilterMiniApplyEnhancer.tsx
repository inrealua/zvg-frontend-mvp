"use client";

import { useEffect } from "react";

type Locale = "de" | "ru" | "en";

function getLocale(): Locale {
  const match = document.cookie.match(/(?:^|;\s*)zvg_locale=(de|ru|en)(?:;|$)/);
  return (match?.[1] as Locale) || "de";
}

function label(locale: Locale) {
  if (locale === "ru") return "Применить";
  if (locale === "en") return "Apply";
  return "Anwenden";
}

function addMiniButtons() {
  const locale = getLocale();
  const text = label(locale);

  const selectors = [
    ".filters-v49 .field",
    ".filters-v50 .field",
    ".filters-v51 .field",
    ".advanced-filters .field",
    ".advanced-check-group",
    ".advanced-range-card",
    ".radius-range-card-v49",
    ".radius-range-card-v50",
    ".radius-range-card-v51",
  ];

  document.querySelectorAll<HTMLElement>(selectors.join(",")).forEach((block) => {
    if (block.querySelector(":scope > .filter-mini-apply-v51")) return;
    if (block.closest(".filter-actions")) return;

    const form = block.closest("form");
    if (!form) return;

    const button = document.createElement("button");
    button.type = "submit";
    button.className = "filter-mini-apply-v51";
    button.textContent = "›";
    button.title = text;
    button.setAttribute("aria-label", text);

    block.classList.add("filter-mini-apply-host-v51");
    block.appendChild(button);
  });
}

export function FilterMiniApplyEnhancer() {
  useEffect(() => {
    addMiniButtons();
    const timer = window.setInterval(addMiniButtons, 500);
    const observer = new MutationObserver(addMiniButtons);
    observer.observe(document.body, { childList: true, subtree: true });

    return () => {
      window.clearInterval(timer);
      observer.disconnect();
    };
  }, []);

  return null;
}
