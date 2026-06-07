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
 * Stage 73C
 *
 * Error:
 * const stage73HeroText = {
 *   de: {
 *     kicker: stage73Hero(locale...).kicker,
 * ...
 *
 * Stage 73's broad regex changed values inside stage73HeroText itself,
 * creating a self-reference.
 *
 * Fix:
 * Replace the whole stage73HeroText + stage73Hero block with a clean static dictionary.
 */

const cleanBlock = `type Stage73HeroLocale = "de" | "ru" | "en";

const stage73HeroText: Record<Stage73HeroLocale, { kicker: string; title: string; subtitle: string }> = {
  de: {
    kicker: "ZVG-DE.COM · ALLE GERICHTLICHEN AUKTIONEN AN EINEM ORT",
    title: "Professionelles Werkzeug",
    subtitle: "für die Immobiliensuche in Deutschland",
  },
  ru: {
    kicker: "ZVG-DE.COM · ВСЕ СУДЕБНЫЕ АУКЦИОНЫ В ОДНОМ МЕСТЕ",
    title: "Профессиональный инструмент",
    subtitle: "для поиска недвижимости в Германии",
  },
  en: {
    kicker: "ZVG-DE.COM · ALL JUDICIAL AUCTIONS IN ONE PLACE",
    title: "Professional tool",
    subtitle: "for finding real estate in Germany",
  },
};

function stage73Hero(locale: Stage73HeroLocale) {
  return stage73HeroText[locale] || stage73HeroText.de;
}
`;

// Replace broken block from const stage73HeroText through function stage73Hero.
const blockRegex = /(?:type\s+Stage73HeroLocale[\s\S]*?)?const\s+stage73HeroText[\s\S]*?function\s+stage73Hero\([^)]*\)\s*\{[\s\S]*?\n\}/;

if (blockRegex.test(s)) {
  s = s.replace(blockRegex, cleanBlock);
} else {
  s = cleanBlock + "\n" + s;
}

// Fix any remaining stage73Hero calls with old inline type to new alias.
s = s.replace(/stage73Hero\(locale as "de" \| "ru" \| "en"\)/g, "stage73Hero(locale as Stage73HeroLocale)");

// Fix accidental JSX literal braces if present.
s = s.replace(/\{stage73Hero\(locale as Stage73HeroLocale\)\.title\}/g, "{stage73Hero(locale as Stage73HeroLocale).title}");
s = s.replace(/\{stage73Hero\(locale as Stage73HeroLocale\)\.subtitle\}/g, "{stage73Hero(locale as Stage73HeroLocale).subtitle}");
s = s.replace(/\{stage73Hero\(locale as Stage73HeroLocale\)\.kicker\}/g, "{stage73Hero(locale as Stage73HeroLocale).kicker}");

fs.writeFileSync(file, s, "utf8");
console.log("Stage 73C fixed stage73HeroText self-reference.");
