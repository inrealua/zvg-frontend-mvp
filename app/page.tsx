import { ActiveFilters } from "@/components/ActiveFilters";
import { EmptyState } from "@/components/EmptyState";
import { FilterBar } from "@/components/FilterBar";
import { PropertyCard } from "@/components/PropertyCard";
import { PropertyMap } from "@/components/PropertyMap";
import { SaveSearchButton } from "@/components/SaveSearchButton";
import { prisma } from "@/lib/prisma";
import { buildActiveFilterChips, buildPropertyOrderBy, buildPropertyWhere } from "@/lib/search-params";
import { formatEuro, formatNumber } from "@/lib/format";
import { getCurrentUser } from "@/lib/user-auth";

type HomeSearchParams = Promise<Record<string, string | string[] | undefined>>;

function buildCurrentFiltersUrl(params: Record<string, string | string[] | undefined>): string {
  const urlParams = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (Array.isArray(value)) {
      value.forEach((item) => {
        if (item) urlParams.append(key, item);
      });
      return;
    }

    if (value) urlParams.set(key, value);
  });

  const query = urlParams.toString();
  return query ? `/?${query}` : "/";
}

export const dynamic = "force-dynamic";

export default async function HomePage({ searchParams }: { searchParams: HomeSearchParams }) {
  const params = await searchParams;
  const where = buildPropertyWhere(params);
  const orderBy = buildPropertyOrderBy(params);
  const activeChips = buildActiveFilterChips(params);
  const currentUser = await getCurrentUser();

  const [properties, statesRaw, courtsRaw, citiesRaw, totalCount, allCount, aggregate] = await Promise.all([
    prisma.property.findMany({
      where,
      include: {
        images: {
          orderBy: [{ isMain: "desc" }, { sortOrder: "asc" }],
          take: 1
        }
      },
      orderBy,
      take: 200
    }),
    prisma.property.findMany({ select: { state: true }, distinct: ["state"], orderBy: { state: "asc" } }),
    prisma.property.findMany({ select: { court: true }, distinct: ["court"], orderBy: { court: "asc" } }),
    prisma.property.findMany({ select: { city: true }, distinct: ["city"], orderBy: { city: "asc" } }),
    prisma.property.count({ where }),
    prisma.property.count(),
    prisma.property.aggregate({
      where,
      _min: { marketValue: true },
      _max: { marketValue: true },
      _avg: { marketValue: true }
    })
  ]);

  const states = statesRaw.map((item) => item.state);
  const courts = courtsRaw.map((item) => item.court);
  const cities = citiesRaw.map((item) => item.city);
  const activeCount = properties.filter((property) => property.status === "ACTIVE").length;
  const cancelledCount = properties.filter((property) => property.status === "CANCELLED").length;
  const mapProperties = properties.map((property) => ({
    id: property.id,
    title: property.title,
    address: property.address,
    latitude: property.latitude,
    longitude: property.longitude,
    status: property.status,
    propertyTypeGroup: property.propertyTypeGroup,
    city: property.city,
    marketValue: property.marketValue,
    auctionDate: property.auctionDate ? property.auctionDate.toISOString() : null,
    imageUrl: property.images[0]?.url ?? null
  }));

  const favoriteRows = currentUser
    ? await prisma.favorite.findMany({
        where: { userId: currentUser.id, propertyId: { in: properties.map((property) => property.id) } },
        select: { propertyId: true }
      })
    : [];
  const favoriteIds = new Set(favoriteRows.map((favorite) => favorite.propertyId));
  const filtersUrl = buildCurrentFiltersUrl(params);
  const searchSummary = activeChips.length > 0 ? activeChips.map((chip) => chip.label).join(" · ") : "Все объекты";

  return (
    <main>
      <section className="hero">
        <div className="container hero-grid">
          <div>
            <p className="hero-kicker">MVP · Datenbank zuerst · Import später direkt in MySQL</p>
            <h1>Объекты судебных торгов Германии в одной базе</h1>
            <p>
              Этот этап уже работает от базы данных: объекты, фото, документы, фильтры, карта и страницы деталей.
              Парсеры, AI-анализ, личный кабинет и админка будут добавляться отдельными безопасными этапами.
            </p>
          </div>
          <div className="hero-stats">
            <div><span>{formatNumber(allCount)}</span><b>объектов в базе</b></div>
            <div><span>{formatNumber(totalCount)}</span><b>найдено фильтром</b></div>
            <div><span>{formatEuro(Math.round(aggregate._avg.marketValue ?? 0))}</span><b>средний Verkehrswert</b></div>
          </div>
        </div>
      </section>

      <section className="container page-section">
        <FilterBar states={states} courts={courts} cities={cities} />
        <ActiveFilters chips={activeChips} />

        <div className="summary-strip">
          <div><span>Показано</span><b>{properties.length}</b></div>
          <div><span>Всего найдено</span><b>{totalCount}</b></div>
          <div><span>Активные</span><b>{activeCount}</b></div>
          <div><span>Отменённые</span><b>{cancelledCount}</b></div>
          <div><span>Цена от</span><b>{formatEuro(aggregate._min.marketValue)}</b></div>
          <div><span>Цена до</span><b>{formatEuro(aggregate._max.marketValue)}</b></div>
        </div>

        <div className="layout-grid">
          <div>
            <div className="results-head">
              <div>
                <strong>Список объектов</strong>
                <span>Сортировка и фильтры работают через URL, поэтому ссылки можно сохранять.</span>
              </div>
              <SaveSearchButton filtersUrl={filtersUrl} summary={searchSummary} />
            </div>

            {properties.length === 0 ? (
              <EmptyState />
            ) : (
              <div className="card-list">
                {properties.map((property) => <PropertyCard key={property.id} property={property} isFavorite={favoriteIds.has(property.id)} />)}
              </div>
            )}
          </div>

          <PropertyMap properties={mapProperties} />
        </div>
      </section>
    </main>
  );
}
