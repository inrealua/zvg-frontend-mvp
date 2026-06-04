import fs from "node:fs";
import path from "node:path";

const schemaPath = path.join(process.cwd(), "prisma", "schema.prisma");

if (!fs.existsSync(schemaPath)) {
  console.error("schema.prisma not found:", schemaPath);
  process.exit(1);
}

let schema = fs.readFileSync(schemaPath, "utf8");

function insertAfter(source, needle, insertText) {
  const index = source.indexOf(needle);
  if (index === -1) return source;
  return source.slice(0, index + needle.length) + insertText + source.slice(index + needle.length);
}

function insertBefore(source, needle, insertText) {
  const index = source.indexOf(needle);
  if (index === -1) return source + "\n\n" + insertText;
  return source.slice(0, index) + insertText + "\n\n" + source.slice(index);
}

let changed = false;

if (!schema.includes("enum Locale")) {
  const localeEnum = `

enum Locale {
  DE
  RU
  EN
}
`;
  if (schema.includes("enum UserRole")) {
    const userRoleEnd = schema.indexOf("}", schema.indexOf("enum UserRole"));
    schema = schema.slice(0, userRoleEnd + 1) + localeEnum + schema.slice(userRoleEnd + 1);
  } else {
    schema = insertAfter(schema, 'datasource db {\n  provider = "mysql"\n  url      = env("DATABASE_URL")\n}\n', localeEnum);
  }
  changed = true;
}

if (!schema.includes("model PropertyTranslation")) {
  const translationModel = `model PropertyTranslation {
  id                   String    @id @default(cuid())
  propertyId           String
  locale               Locale

  title                String
  propertyType         String?
  description          String    @db.Text
  locationDescription  String?   @db.Text

  property             Property  @relation(fields: [propertyId], references: [id], onDelete: Cascade)

  createdAt            DateTime  @default(now())
  updatedAt            DateTime  @default(now()) @updatedAt

  @@unique([propertyId, locale])
  @@index([locale])
  @@index([propertyId])
}
`;

  if (schema.includes("enum ImportStatus")) {
    schema = insertBefore(schema, "enum ImportStatus", translationModel);
  } else {
    schema = schema.trimEnd() + "\n\n" + translationModel + "\n";
  }
  changed = true;
}

if (!/translations\s+PropertyTranslation\[\]/.test(schema)) {
  const propertyModelStart = schema.indexOf("model Property {");
  if (propertyModelStart === -1) {
    console.error("model Property was not found in schema.prisma");
    process.exit(1);
  }

  const propertyModelEnd = schema.indexOf("\n}", propertyModelStart);
  const propertyModel = schema.slice(propertyModelStart, propertyModelEnd);

  let inserted = false;
  const relationCandidates = [
    /\n\s+favorites\s+Favorite\[\]/,
    /\n\s+documents\s+PropertyDocument\[\]/,
    /\n\s+images\s+PropertyImage\[\]/,
  ];

  for (const candidate of relationCandidates) {
    const match = propertyModel.match(candidate);
    if (match) {
      const absolute = propertyModelStart + match.index + match[0].length;
      schema = schema.slice(0, absolute) + "\n  translations             PropertyTranslation[]" + schema.slice(absolute);
      inserted = true;
      changed = true;
      break;
    }
  }

  if (!inserted) {
    schema = schema.slice(0, propertyModelEnd) + "\n  translations             PropertyTranslation[]" + schema.slice(propertyModelEnd);
    changed = true;
  }
}

if (changed) {
  fs.writeFileSync(schemaPath, schema, "utf8");
  console.log("schema.prisma patched for Stage 47B.");
} else {
  console.log("schema.prisma already contains Stage 47B translation model.");
}
