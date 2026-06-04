import fs from "node:fs";
import path from "node:path";

function read(file) {
  return fs.existsSync(file) ? fs.readFileSync(file, "utf8") : null;
}

function write(file, source) {
  fs.writeFileSync(file, source, "utf8");
  console.log("fixed", file);
}

function removeImport(source, moduleName, importedName) {
  const line = new RegExp(`^import\\s+\\{[^}]*\\b${importedName}\\b[^}]*\\}\\s+from\\s+["']${moduleName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}["'];\\n`, "m");
  return source.replace(line, "");
}

function fixSimpleSyntax(file) {
  let source = read(file);
  if (source === null) return;

  const original = source;

  // Bad JSX produced by previous automatic patch:
  // {isLoading ? "Entferne..." : {ui.common.remove}}
  source = source.replaceAll(': {ui.common.remove}}', ': ui.common.remove}');
  source = source.replaceAll(': {ui.common.save}}', ': ui.common.save}');
  source = source.replaceAll(': {ui.common.details}}', ': ui.common.details}');
  source = source.replaceAll(': {ui.common.moreDetails}}', ': ui.common.moreDetails}');

  // Object literals must not use JSX braces.
  source = source.replaceAll('title: {ui.hero.title}', 'title: ui.hero.title');
  source = source.replaceAll('text: {ui.hero.subtitle}', 'text: ui.hero.subtitle');
  source = source.replaceAll('listTitle: "{publicUi.topTitle}"', 'listTitle: publicUi.topTitle');
  source = source.replaceAll('listText: "{publicUi.topSubtitle}"', 'listText: publicUi.topSubtitle');
  source = source.replaceAll('listTitle: "{ui.quickSearch.title}"', 'listTitle: ui.quickSearch.title');
  source = source.replaceAll('listText: "{ui.quickSearch.subtitle}"', 'listText: ui.quickSearch.subtitle');

  if (source !== original) write(file, source);
}

function fixLayout() {
  const file = path.join(process.cwd(), "app", "layout.tsx");
  let source = read(file);
  if (!source) return;

  const original = source;

  // layout already uses getLocale(); remove accidental Stage47E server i18n insertion.
  source = removeImport(source, "@/lib/i18n/ui-texts", "getUiText");
  source = removeImport(source, "@/lib/i18n/server", "getI18n");

  source = source.replace(/\n\s*const\s+\{\s*locale\s*\}\s*=\s*await\s+getI18n\(\);\s*\n\s*const\s+ui\s*=\s*getUiText\(locale\);\s*/g, "\n");

  if (source !== original) write(file, source);
}

function fixCabinet() {
  const file = path.join(process.cwd(), "app", "cabinet", "page.tsx");
  let source = read(file);
  if (!source) return;

  const original = source;

  // cabinet already has: const { locale, t } = await getI18n(); const ui = getPropertyUi(locale);
  // remove the accidental extra pair: const { locale } = await getI18n(); const ui = getUiText(locale);
  source = removeImport(source, "@/lib/i18n/ui-texts", "getUiText");
  source = source.replace(/\n\s*const\s+\{\s*locale\s*\}\s*=\s*await\s+getI18n\(\);\s*\n\s*const\s+ui\s*=\s*getUiText\(locale\);\s*(?=\n\s*const\s+\{\s*locale\s*,\s*t\s*\}\s*=\s*await\s+getI18n\(\);)/g, "\n");

  if (source !== original) write(file, source);
}

function fixPropertyDetail() {
  const file = path.join(process.cwd(), "app", "properties", "[id]", "page.tsx");
  let source = read(file);
  if (!source) return;

  const original = source;

  // detail page already has getI18n + getPropertyUi; remove accidental extra getUiText pair.
  source = removeImport(source, "@/lib/i18n/ui-texts", "getUiText");
  source = source.replace(/\n\s*const\s+\{\s*locale\s*\}\s*=\s*await\s+getI18n\(\);\s*\n\s*const\s+ui\s*=\s*getUiText\(locale\);\s*(?=\n\s*const\s+\{\s*id\s*\}\s*=\s*await\s+params;)/g, "\n");

  if (source !== original) write(file, source);
}

function fixClientComponent(file) {
  let source = read(file);
  if (!source) return;

  const original = source;

  // If previous patch inserted server imports/consts into client components, remove them.
  source = removeImport(source, "@/lib/i18n/ui-texts", "getUiText");
  source = removeImport(source, "@/lib/i18n/server", "getI18n");

  // Client components cannot await getI18n().
  source = source.replace(/\n\s*const\s+\{\s*locale\s*\}\s*=\s*await\s+getI18n\(\);\s*\n\s*const\s+ui\s*=\s*getUiText\(locale\);\s*/g, "\n");

  // Use plain strings in client components for now; we will localize them with a client dictionary later.
  source = source.replaceAll("ui.common.remove", '"Entfernen"');
  source = source.replaceAll("ui.common.save", '"Speichern"');
  source = source.replaceAll("ui.common.details", '"Details"');
  source = source.replaceAll("ui.common.moreDetails", '"Details ansehen"');

  if (source !== original) write(file, source);
}

fixSimpleSyntax(path.join(process.cwd(), "components", "DeleteFavoriteButton.tsx"));
fixSimpleSyntax(path.join(process.cwd(), "components", "FavoriteNoteForm.tsx"));
fixSimpleSyntax(path.join(process.cwd(), "components", "SavedSearchNameForm.tsx"));
fixSimpleSyntax(path.join(process.cwd(), "components", "PublicPropertiesPage.tsx"));

fixClientComponent(path.join(process.cwd(), "components", "DeleteFavoriteButton.tsx"));
fixClientComponent(path.join(process.cwd(), "components", "FavoriteNoteForm.tsx"));
fixClientComponent(path.join(process.cwd(), "components", "SavedSearchNameForm.tsx"));

fixLayout();
fixCabinet();
fixPropertyDetail();

console.log("Stage 47E hotfix completed. Now run: npm run build");
