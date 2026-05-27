import { JSON_IMPORT_TEMPLATE } from "@/lib/import-templates";

export const dynamic = "force-dynamic";

export function GET() {
  return new Response(JSON_IMPORT_TEMPLATE, {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": 'attachment; filename="zvg-import-template.json"'
    }
  });
}
