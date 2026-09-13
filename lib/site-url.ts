const DEFAULT_SITE_URL = "https://zvg-de.com";

function isPlaceholder(value: string): boolean {
  const v = value.trim().toLowerCase();
  return (
    !v ||
    v === "[sensitive]" ||
    v === "sensitive" ||
    v === "[redacted]" ||
    v === "redacted" ||
    v.includes("your-domain") ||
    v.includes("example.com")
  );
}

export function getSiteUrl(): string {
  const raw = String(process.env.NEXT_PUBLIC_SITE_URL || "").trim();
  if (isPlaceholder(raw)) return DEFAULT_SITE_URL;

  try {
    const url = new URL(raw);
    if (url.protocol !== "http:" && url.protocol !== "https:") return DEFAULT_SITE_URL;
    return url.origin;
  } catch {
    return DEFAULT_SITE_URL;
  }
}
