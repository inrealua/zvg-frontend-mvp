import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const file = path.join(root, "components", "PublicPropertiesPage.tsx");

if (!fs.existsSync(file)) {
  console.error("File not found:", file);
  process.exit(1);
}

let s = fs.readFileSync(file, "utf8");

/**
 * Stage 71B
 *
 * Stage 71 accidentally inserted:
 *
 * export async function PublicPropertiesPage({
 *   params,
 *   mode,
 *   forcedLocale,
 *   forcedLocale?: "de" | "ru" | "en";
 * }: {
 *
 * The type line belongs inside the type object after `}: {`, not inside destructuring.
 */

// 1) Remove bad line from destructuring.
s = s.replace(/\n\s*forcedLocale\?:\s*"de"\s*\|\s*"ru"\s*\|\s*"en";/g, "");

// 2) Ensure forcedLocale is included in destructuring.
s = s.replace(
  /export async function PublicPropertiesPage\(\{\s*params,\s*mode,\s*\}/,
  `export async function PublicPropertiesPage({
  params,
  mode,
  forcedLocale,
}`
);

// 3) Ensure type object has forcedLocale type.
if (!/forcedLocale\?:\s*"de"\s*\|\s*"ru"\s*\|\s*"en";/.test(s)) {
  s = s.replace(
    /(mode:\s*PageMode;\s*)/,
    `$1
  forcedLocale?: "de" | "ru" | "en";`
  );

  // Fallback for other prop type shape.
  if (!/forcedLocale\?:\s*"de"\s*\|\s*"ru"\s*\|\s*"en";/.test(s)) {
    s = s.replace(
      /(mode\??:\s*[^;]+;\s*)/,
      `$1
  forcedLocale?: "de" | "ru" | "en";`
    );
  }
}

// 4) Ensure locale uses forcedLocale, but don't duplicate if already fixed.
if (s.includes("const i18n = await getI18n();") && s.includes("const locale = forcedLocale ?? i18n.locale;")) {
  // already ok
} else {
  s = s.replace(
    /const\s+\{\s*locale\s*,\s*t\s*\}\s*=\s*await\s+getI18n\(\)\s*;/,
    `const i18n = await getI18n();
  const locale = forcedLocale ?? i18n.locale;
  const t = i18n.t;`
  );

  s = s.replace(
    /const\s+\{\s*locale\s*\}\s*=\s*await\s+getI18n\(\)\s*;/,
    `const i18n = await getI18n();
  const locale = forcedLocale ?? i18n.locale;`
  );
}

fs.writeFileSync(file, s, "utf8");
console.log("Stage 71B fixed PublicPropertiesPage signature.");
