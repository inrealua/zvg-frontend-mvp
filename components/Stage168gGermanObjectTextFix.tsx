"use client";

import { useEffect } from "react";

function currentLocale() {
  if (typeof window === "undefined") return "de";
  const first = window.location.pathname.split("/").filter(Boolean)[0];
  if (first === "ru" || first === "en" || first === "de") return first;
  const cookie = document.cookie.match(/(?:^|;\s*)zvg_locale=(de|ru|en)(?:;|$)/);
  return cookie?.[1] || "de";
}

function fixText(value: string) {
  let text = value;

  const unknown = "(?:UNKNOWN|Unknown|Unbekannt|Неизвестно|Невідомо|РќРµРёР·РІРµСЃС‚РЅРѕ|РќРµРё|РќРµ)";
  const vacant = "(?:VACANT|Vacant|Frei|Свободен|РЎРІРѕР±РѕРґРµРЅ)";
  const rented = "(?:RENTED|Rented|Vermietet|Сдан в аренду|РЎРґР°РЅ)";
  const owner = "(?:OWNER_OCCUPIED|Owner-occupied|Eigennutzung|Используется собственником|РСЃРїРѕР»СЊР·СѓРµС‚СЃСЏ)";

  text = text.replace(new RegExp(`(Nutzung\\s*:?\\s*)${unknown}`, "gi"), "$1Unbekannt");
  text = text.replace(new RegExp(`(Nutzung\\s*:?\\s*)${vacant}`, "gi"), "$1Frei");
  text = text.replace(new RegExp(`(Nutzung\\s*:?\\s*)${rented}`, "gi"), "$1Vermietet");
  text = text.replace(new RegExp(`(Nutzung\\s*:?\\s*)${owner}`, "gi"), "$1Eigennutzung");

  text = text.replace(new RegExp(`(Use\\s*:?\\s*)${unknown}`, "gi"), "$1Unknown");
  text = text.replace(new RegExp(`(Использование\\s*:?\\s*)${unknown}`, "gi"), "$1Неизвестно");

  // Detail pages sometimes render label and value in separate inline nodes.
  if (/^\s*(UNKNOWN|Unknown|Неизвестно|Невідомо|РќРµРёР·РІРµСЃС‚РЅРѕ|РќРµРё|РќРµ)\s*$/i.test(text)) {
    return "Unbekannt";
  }

  return text;
}

function walkAndFix(root: ParentNode) {
  const locale = currentLocale();
  if (locale !== "de") return;

  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const nodes: Text[] = [];

  while (walker.nextNode()) {
    const node = walker.currentNode as Text;
    const parent = node.parentElement;
    if (!parent) continue;

    const tag = parent.tagName.toLowerCase();
    if (tag === "script" || tag === "style" || tag === "textarea" || tag === "input") continue;

    const before = node.nodeValue || "";
    if (!/(Nutzung|UNKNOWN|Unknown|Неизвестно|Невідомо|РќРµ|VACANT|RENTED|OWNER_OCCUPIED)/i.test(before)) continue;
    nodes.push(node);
  }

  for (const node of nodes) {
    const before = node.nodeValue || "";
    const after = fixText(before);
    if (after !== before) node.nodeValue = after;
  }
}

export function Stage168gGermanObjectTextFix() {
  useEffect(() => {
    let raf = 0;

    const run = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => walkAndFix(document.body));
    };

    run();

    const observer = new MutationObserver(run);
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true,
    });

    window.addEventListener("popstate", run);
    window.addEventListener("focus", run);

    return () => {
      cancelAnimationFrame(raf);
      observer.disconnect();
      window.removeEventListener("popstate", run);
      window.removeEventListener("focus", run);
    };
  }, []);

  return null;
}

export default Stage168gGermanObjectTextFix;
