import { notFound } from "next/navigation";
import { PublicPropertiesPage } from "@/components/PublicPropertiesPage";

const LOCALES = ["ru", "de", "en"] as const;
type Locale = (typeof LOCALES)[number];

function isLocale(value: string): value is Locale {
  return value === "ru" || value === "de" || value === "en";
}

export default async function LocaleHomePage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { locale } = await params;

  if (!isLocale(locale)) {
    notFound();
  }

  const resolvedSearchParams = searchParams ? await searchParams : {};

  return <PublicPropertiesPage params={resolvedSearchParams} mode="objects" forcedLocale={locale} />;
}
