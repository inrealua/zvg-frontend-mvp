import { CSV_IMPORT_TEMPLATE } from "@/lib/import-templates";

export const dynamic = "force-dynamic";

export function GET() {
  return new Response(CSV_IMPORT_TEMPLATE, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="zvg-import-template.csv"'
    }
  });
}
