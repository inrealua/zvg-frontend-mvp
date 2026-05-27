import { PublicPropertiesPage } from "@/components/PublicPropertiesPage";

export const dynamic = "force-dynamic";

type PageSearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function ArchivePage({ searchParams }: { searchParams: PageSearchParams }) {
  return <PublicPropertiesPage params={await searchParams} mode="archive" />;
}
