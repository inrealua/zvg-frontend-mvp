const fs = require("node:fs");
const path = require("node:path");

const root = process.cwd();
const target = path.join(root, "scripts", "import_normalized_zvg_to_db.cjs");

if (!fs.existsSync(target)) {
  console.error("Not found:", target);
  process.exit(1);
}

let s = fs.readFileSync(target, "utf8");

if (!s.includes("STAGE124_IMPORT_STATE_FIX")) {
  const patch = String.raw`

// STAGE124_IMPORT_STATE_FIX
// Fix: Prisma Property.state is required String, but normalized address.state can be null.
// For zvg-portal.de land_abk=sn and Saxony courts/addresses, infer "Sachsen".
// Also sanitize create/update data: remove null/undefined values where possible, but keep
// explicit status fields because CANCELLED must overwrite DB status.

function stage124InferState(n) {
  const existing = n?.address?.state;
  if (existing && String(existing).trim()) return existing;

  const blob = JSON.stringify({
    source: n?.source,
    auction: n?.auction,
    address: n?.address,
    geo: n?.geo,
  }).toLowerCase();

  if (
    blob.includes("land_abk=sn") ||
    blob.includes("sachsen") ||
    blob.includes("amtsgericht zwickau") ||
    blob.includes("amtsgericht bautzen") ||
    blob.includes("amtsgericht görlitz") ||
    blob.includes("amtsgericht goerlitz") ||
    /^0[1-9]\d{3}$/.test(String(n?.address?.postalCode || ""))
  ) {
    return "Sachsen";
  }

  return "Unbekannt";
}

function stage124SanitizeDataForPrisma(data) {
  const out = {};
  for (const [k, v] of Object.entries(data || {})) {
    if (v === undefined) continue;

    // Keep explicit null only for status timestamps where schema may allow it is risky.
    // In practice, non-nullable fields should not receive null.
    if (v === null) continue;

    out[k] = v;
  }
  return out;
}

const _propertyData_stage124 = propertyData;
propertyData = function stage124PropertyData(n) {
  if (!n.address) n.address = {};
  n.address.state = stage124InferState(n);

  const data = _propertyData_stage124(n);

  // Ensure required state is always present if Property.state exists.
  if (has("Property", "state") && (data.state === undefined || data.state === null || data.state === "")) {
    data.state = stage124InferState(n);
  }

  // Safety for country if required in schema.
  if (has("Property", "country") && (data.country === undefined || data.country === null || data.country === "")) {
    data.country = "DE";
  }

  return stage124SanitizeDataForPrisma(data);
};

`;

  // Insert before main() call area, after functions are defined.
  s = s.replace(/\nfunction findFiles\(root\) \{/, patch + "\nfunction findFiles(root) {");
}

fs.writeFileSync(target, s, "utf8");
console.log("patched", target);
console.log("");
console.log("Run dry first:");
console.log("  $env:ZVG_DRY_RUN='1'");
console.log("  node .\\scripts\\import_normalized_zvg_to_db.cjs --input=.\\normalized --limit=3 --dry-run");
console.log("");
console.log("Then real import:");
console.log("  Remove-Item Env:ZVG_DRY_RUN -ErrorAction SilentlyContinue");
console.log("  node .\\scripts\\import_normalized_zvg_to_db.cjs --input=.\\normalized");
