import { PublicPropertiesPage } from "@/components/PublicPropertiesPage";

export default async function ENHomePage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const resolvedSearchParams = searchParams ? await searchParams : {};
  return <PublicPropertiesPage params={resolvedSearchParams} mode="objects" forcedLocale="en" />;
}
