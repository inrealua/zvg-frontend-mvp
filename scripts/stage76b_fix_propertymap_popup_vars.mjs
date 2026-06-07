import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const file = path.join(root, "components", "PropertyMap.tsx");

if (!fs.existsSync(file)) {
  console.error("File not found:", file);
  process.exit(1);
}

let s = fs.readFileSync(file, "utf8");

/**
 * Stage 76B
 *
 * Error:
 *   Cannot find name 'valueText'
 *
 * Cause:
 *   Stage 76 replaced broken popup placeholders with:
 *     ${escapeHtml(valueText)}
 *     ${escapeHtml(detailsText)}
 *     ${escapeHtml(titleText)}
 *   but did not always insert these const variables inside the same scope
 *   where the popup HTML template is built.
 *
 * Fix:
 *   Insert safe local variables directly before the popup HTML template.
 */

// Make sure helper functions exist.
if (!s.includes("function stage76PopupDetails")) {
  const helper = `
function stage76PopupLocale() {
  if (typeof window === "undefined") return "de";
  const first = window.location.pathname.split("/").filter(Boolean)[0];
  if (first === "ru" || first === "de" || first === "en") return first;
  const cookie = document.cookie.match(/(?:^|;\\s*)zvg_locale=(ru|de|en)(?:;|$)/);
  return cookie?.[1] || "de";
}

function stage76PopupDetails() {
  const locale = stage76PopupLocale();
  if (locale === "ru") return "Подробнее";
  if (locale === "en") return "View details";
  return "Details ansehen";
}

function stage76PopupValue() {
  const locale = stage76PopupLocale();
  if (locale === "ru") return "Оценочная стоимость";
  if (locale === "en") return "Market value";
  return "Verkehrswert";
}

function stage76PopupTitle(property: any) {
  return property?.title || property?.headline || property?.address || property?.street || "";
}
`;
  const lastImport = [...s.matchAll(/^import[\s\S]*?;\s*$/gm)].pop();
  if (lastImport) {
    const idx = lastImport.index + lastImport[0].length;
    s = s.slice(0, idx) + "\n" + helper + s.slice(idx);
  } else {
    s = helper + "\n" + s;
  }
}

const vars = `const titleText = stage76PopupTitle(property);
      const detailsText = stage76PopupDetails();
      const valueText = stage76PopupValue();
      `;

// Insert before the specific popup HTML block containing valueText if no variables exist shortly before it.
s = s.replace(
  /(\s*)(const\s+\w+\s*=\s*`[\s\S]{0,400}\$\{escapeHtml\(valueText\)\})/g,
  (match, indent, rest, offset, whole) => {
    const before = whole.slice(Math.max(0, offset - 500), offset);
    if (before.includes("const valueText =")) return match;
    return `${indent}${vars}${rest}`;
  }
);

// Fallback: if template starts with <div class="osm-popup-card"> directly.
s = s.replace(
  /(\s*)(`[\s\S]{0,120}<div class="osm-popup-card"[\s\S]{0,400}\$\{escapeHtml\(valueText\)\})/g,
  (match, indent, rest, offset, whole) => {
    const before = whole.slice(Math.max(0, offset - 500), offset);
    if (before.includes("const valueText =")) return match;
    return `${indent}${vars}${rest}`;
  }
);

// Last resort: replace variables with direct function calls to avoid scope errors.
s = s.replace(/\$\{escapeHtml\(valueText\)\}/g, "${escapeHtml(stage76PopupValue())}");
s = s.replace(/\$\{escapeHtml\(detailsText\)\}/g, "${escapeHtml(stage76PopupDetails())}");
s = s.replace(/\$\{escapeHtml\(titleText\)\}/g, "${escapeHtml(stage76PopupTitle(property))}");

// Keep use client first.
s = s.replace(/["']use client["'];\s*\n?/g, "");
s = `"use client";\n\n` + s.trimStart();

fs.writeFileSync(file, s, "utf8");
console.log("Stage 76B fixed popup variable references.");
