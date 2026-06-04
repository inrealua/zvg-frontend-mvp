import fs from "node:fs";
import path from "node:path";

const filePath = path.join(process.cwd(), "components", "FilterBar.tsx");

if (!fs.existsSync(filePath)) {
  console.error("components/FilterBar.tsx not found");
  process.exit(1);
}

let source = fs.readFileSync(filePath, "utf8");
const original = source;

// Broken JSX from previous automatic patches:
// emptyLabel="Alle" Arten  -> emptyLabel="Alle Arten"
// emptyLabel="Jede" Nutzung -> emptyLabel="Jede Nutzung"
source = source.replaceAll('emptyLabel="Alle" Arten', 'emptyLabel="Alle Arten"');
source = source.replaceAll('emptyLabel="Jede" Nutzung', 'emptyLabel="Jede Nutzung"');
source = source.replaceAll('emptyLabel="Alle" Bundesländer', 'emptyLabel="Alle Bundesländer"');
source = source.replaceAll('emptyLabel="Alle" Gerichte', 'emptyLabel="Alle Gerichte"');
source = source.replaceAll('emptyLabel="Alle" Orte', 'emptyLabel="Alle Orte"');
source = source.replaceAll('emptyLabel="Kein" Radius', 'emptyLabel="Kein Radius"');

// Also fix similar accidental boolean props after German words.
// Example: title="Alle" Arten -> title="Alle Arten"
const attrs = ["title", "label", "placeholder", "emptyLabel", "resetLabel", "buttonLabel", "valueLabel"];

for (const attr of attrs) {
  const patterns = [
    [`${attr}="Alle" Arten`, `${attr}="Alle Arten"`],
    [`${attr}="Jede" Nutzung`, `${attr}="Jede Nutzung"`],
    [`${attr}="Alle" Bundesländer`, `${attr}="Alle Bundesländer"`],
    [`${attr}="Alle" Gerichte`, `${attr}="Alle Gerichte"`],
    [`${attr}="Alle" Orte`, `${attr}="Alle Orte"`],
    [`${attr}="Kein" Radius`, `${attr}="Kein Radius"`],
    [`${attr}="Objekte" finden`, `${attr}="Objekte finden"`],
    [`${attr}="Filter" zurücksetzen`, `${attr}="Filter zurücksetzen"`],
  ];

  for (const [from, to] of patterns) {
    source = source.replaceAll(from, to);
  }
}

// Remove accidental standalone boolean props that should never be there in this file.
source = source.replace(/\s+(Arten|Nutzung|Bundesländer|Gerichte|Orte|Radius)(?=\s+(?:className|name|options|selected|onChange|type|value|\/>|>))/g, "");

// Ensure "use client" first if present.
if (source.includes('"use client";') || source.includes("'use client';")) {
  source = source.replace(/["']use client["'];\s*/g, "");
  source = `"use client";\n\n` + source.trimStart();
}

if (source !== original) {
  fs.writeFileSync(filePath, source, "utf8");
  console.log("Fixed FilterBar emptyLabel/title split words.");
} else {
  console.log("No changes made to FilterBar.");
}

console.log("Now run: npm run build");
