"use client";

import { useEffect } from "react";

const DETAIL_TEXT_RE = /(details\s*ansehen|details|подробнее|детали|смотреть|anzeigen)/i;

function isPropertyLink(anchor: HTMLAnchorElement) {
  const href = anchor.getAttribute("href") || "";
  if (!href) return false;
  const isPropertyHref =
    href.startsWith("/properties/") ||
    href.includes("/properties/") ||
    href.includes("zvg-de.com/properties/");
  if (!isPropertyHref) return false;
  const text = (anchor.textContent || anchor.getAttribute("aria-label") || anchor.getAttribute("title") || "").trim();
  if (DETAIL_TEXT_RE.test(text)) return true;
  return true;
}

function applyDetailsNewTab() {
  document.querySelectorAll<HTMLAnchorElement>('a[href*="/properties/"], a[href^="/properties/"]').forEach((anchor) => {
    if (!isPropertyLink(anchor)) return;
    anchor.setAttribute("target", "_blank");
    anchor.setAttribute("rel", "noopener noreferrer");
  });
}

export function Stage170aDetailsNewTabFix() {
  useEffect(() => {
    let raf = 0;
    const run = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(applyDetailsNewTab);
    };
    run();

    const observer = new MutationObserver(run);
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: true,
      attributeFilter: ["href", "aria-label", "title"],
    });

    window.addEventListener("focus", run);
    window.addEventListener("popstate", run);

    return () => {
      cancelAnimationFrame(raf);
      observer.disconnect();
      window.removeEventListener("focus", run);
      window.removeEventListener("popstate", run);
    };
  }, []);

  return null;
}

export default Stage170aDetailsNewTabFix;
