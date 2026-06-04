import fs from "node:fs";
import path from "node:path";

const filePath = path.join(process.cwd(), "components", "PublicPropertiesPage.tsx");

if (!fs.existsSync(filePath)) {
  console.error("components/PublicPropertiesPage.tsx not found");
  process.exit(1);
}

let source = fs.readFileSync(filePath, "utf8");
const original = source;

// publicUi was inserted into a helper/static function where it is not in scope.
// Restore build by replacing those out-of-scope object fields with stable strings.
// The actual rendered page can still use publicUi inside the component where it exists.

source = source.replaceAll("title: publicUi.topTitle", 'title: "Top 12 aktuelle Objekte"');
source = source.replaceAll("text: publicUi.topSubtitle", 'text: "Kurze Auswahl für die Startseite. Die vollständige Recherche finden Sie in der erweiterten Suche."');
source = source.replaceAll("listTitle: publicUi.topTitle", 'listTitle: "Top 12 aktuelle Objekte"');
source = source.replaceAll("listText: publicUi.topSubtitle", 'listText: "Kurze Auswahl für die Startseite. Die vollständige Recherche finden Sie in der erweiterten Suche."');

// If previous patches left literal "{publicUi...}" strings, fix them too.
source = source.replaceAll('title: "{publicUi.topTitle}"', 'title: "Top 12 aktuelle Objekte"');
source = source.replaceAll('text: "{publicUi.topSubtitle}"', 'text: "Kurze Auswahl für die Startseite. Die vollständige Recherche finden Sie in der erweiterten Suche."');
source = source.replaceAll('listTitle: "{publicUi.topTitle}"', 'listTitle: "Top 12 aktuelle Objekte"');
source = source.replaceAll('listText: "{publicUi.topSubtitle}"', 'listText: "Kurze Auswahl für die Startseite. Die vollständige Recherche finden Sie in der erweiterten Suche."');

// Remove duplicated or unused publicUi setup only if it exists but publicUi no longer appears anywhere.
if (!source.includes("publicUi.")) {
  source = source.replace(/^import\s+\{\s*getPublicUi\s*\}\s+from\s+["']@\/lib\/i18n\/property-labels["'];\s*\n/gm, "");
  source = source.replace(/\n\s*const\s+publicUi\s*=\s*getPublicUi\(locale\);\s*/g, "\n");
}

if (source !== original) {
  fs.writeFileSync(filePath, source, "utf8");
  console.log("Fixed out-of-scope publicUi references in PublicPropertiesPage.tsx.");
} else {
  console.log("No changes made. publicUi references may be in a different form.");
}

console.log("Now run: npm run build");
