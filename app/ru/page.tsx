import { PublicPropertiesPage } from "@/components/PublicPropertiesPage";

export default async function RUHomePage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const resolvedSearchParams = searchParams ? await searchParams : {};
  return <PublicPropertiesPage params={resolvedSearchParams} mode="objects" forcedLocale="ru" />;
}
