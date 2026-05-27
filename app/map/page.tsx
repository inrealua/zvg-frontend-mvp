import { PublicPropertiesPage } from "@/components/PublicPropertiesPage";

export const dynamic = "force-dynamic";

type PageSearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function MapPage({ searchParams }: { searchParams: PageSearchParams }) {
  return <PublicPropertiesPage params={await searchParams} mode="map" />;
}
