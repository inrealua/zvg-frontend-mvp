import { ActiveFilters } from "@/components/ActiveFilters";
import { EmptyState } from "@/components/EmptyState";
import { FilterBar } from "@/components/FilterBar";
import { PropertyCard } from "@/components/PropertyCard";
import { PropertyMap } from "@/components/PropertyMap";
import { Pagination } from "@/components/Pagination";
import { SaveSearchButton } from "@/components/SaveSearchButton";
import { prisma } from "@/lib/prisma";
import { asNumber, asString, buildActiveFilterChips, buildPropertyOrderBy, buildPropertyWhere } from "@/lib/search-params";
import { formatEuro, formatNumber } from "@/lib/format";
import { getCurrentUser } from "@/lib/user-auth";
import { distanceKm, findKnownLocation, type GeoPoint } from "@/lib/geo";
import { getPaginationRange, getPaginationState } from "@/lib/pagination";

export const dynamic = "force-dynamic";

type HomeSearchParams = Promise<Record<string, string | string[] | undefined>>;

type RadiusFilter = {
  center: GeoPoint;
  radiusKm: number;
};

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

async function resolveRadiusFilter(params: Record<string, string | string[] | undefined>): Promise<RadiusFilter | null> {
  const location = asString(params.location);
  const radiusKm = asNumber(params.radiusKm);

  if (!location || !radiusKm || radiusKm <= 0) return null;

  const knownLocation = findKnownLocation(location);
  if (knownLocation) {
    return { center: knownLocation, radiusKm };
  }

  const propertyWithCoordinates = await prisma.property.findFirst({
    where: {
      OR: [
        { city: { contains: location } },
        { postalCode: { startsWith: location } },
        { address: { contains: location } }
      ],
      latitude: { not: null },
      longitude: { not: null }
    },
    select: {
      city: true,
      postalCode: true,
      latitude: true,
      longitude: true
    },
    orderBy: { updatedAt: "desc" }
  });

  if (!propertyWithCoordinates?.latitude || !propertyWithCoordinates?.longitude) return null;

  return {
    center: {
      latitude: propertyWithCoordinates.latitude,
      longitude: propertyWithCoordinates.longitude,
      label: `${propertyWithCoordinates.city} ${propertyWithCoordinates.postalCode}`.trim()
    },
    radiusKm
  };
}

function calculateMarketStats(properties: Array<{ marketValue: number | null }>) {
  const values = properties
    .map((property) => property.marketValue)
    .filter((value): value is number => typeof value === "number" && Number.isFinite(value));

  if (values.length === 0) {
    return { min: null as number | null, max: null as number | null, avg: null as number | null };
  }

  const min = Math.min(...values);
  const max = Math.max(...values);
  const avg = Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);

  return { min, max, avg };
}

export default async function HomePage({ searchParams }: { searchParams: HomeSearchParams }) {
  const params = await searchParams;
  const where = buildPropertyWhere(params);
  const orderBy = buildPropertyOrderBy(params);
  const activeChips = buildActiveFilterChips(params);
  const currentUser = await getCurrentUser();
  const radiusFilter = await resolveRadiusFilter(params);
  const paginationState = getPaginationState(params);

  const [rawProperties, statesRaw, courtsRaw, citiesRaw, allCount] = await Promise.all([
    prisma.property.findMany({
      where,
      include: {
        images: {
          orderBy: [{ isMain: "desc" }, { sortOrder: "asc" }],
          take: 1
        }
      },
      orderBy,
      take: 1000
    }),
    prisma.property.findMany({ select: { state: true }, distinct: ["state"], orderBy: { state: "asc" } }),
    prisma.property.findMany({ select: { court: true }, distinct: ["court"], orderBy: { court: "asc" } }),
    prisma.property.findMany({ select: { city: true }, distinct: ["city"], orderBy: { city: "asc" } }),
    prisma.property.count()
  ]);

  const propertiesWithDistance = radiusFilter
    ? rawProperties
        .map((property) => {
          if (typeof property.latitude !== "number" || typeof property.longitude !== "number") {
            return { property, distance: null as number | null };
          }

          return {
            property,
            distance: distanceKm(radiusFilter.center, {
              latitude: property.latitude,
              longitude: property.longitude
            })
          };
        })
        .filter((item) => item.distance !== null && item.distance <= radiusFilter.radiusKm)
        .sort((a, b) => (a.distance ?? 0) - (b.distance ?? 0))
    : rawProperties.map((property) => ({ property, distance: null as number | null }));

  const totalCount = propertiesWithDistance.length;
  const pagination = getPaginationRange(totalCount, paginationState);
  const properties = propertiesWithDistance
    .slice(pagination.startIndex, pagination.endIndex)
    .map((item) => item.property);
  const allFilteredProperties = propertiesWithDistance.map((item) => item.property);
  const marketStats = calculateMarketStats(allFilteredProperties);

  const states = statesRaw.map((item) => item.state);
  const courts = courtsRaw.map((item) => item.court);
  const cities = citiesRaw.map((item) => item.city);
  const activeCount = allFilteredProperties.filter((property) => property.status === "ACTIVE").length;
  const cancelledCount = allFilteredProperties.filter((property) => property.status === "CANCELLED").length;
  const mapProperties = allFilteredProperties.slice(0, 500).map((property) => ({
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
            <p className="hero-kicker">MVP · Datenbank zuerst · Import direkt in MySQL</p>
            <h1>Объекты судебных торгов Германии в одной базе</h1>
            <p>
              Добавлен фильтр по видимой области карты: можно приблизить карту, нажать кнопку и получить только объекты
              внутри выбранного фрагмента карты. Данные берутся напрямую из базы, без парсеров и без AI-модуля.
            </p>
          </div>
          <div className="hero-stats">
            <div><span>{formatNumber(allCount)}</span><b>объектов в базе</b></div>
            <div><span>{formatNumber(totalCount)}</span><b>найдено фильтром</b></div>
            <div><span>{formatEuro(marketStats.avg)}</span><b>средний Verkehrswert</b></div>
          </div>
        </div>
      </section>

      <section className="container page-section">
        <FilterBar states={states} courts={courts} cities={cities} />
        <ActiveFilters chips={activeChips} />

        {radiusFilter ? (
          <div className="notice-bar">
            Radius-Suche: центр <b>{radiusFilter.center.label}</b>, радиус <b>{radiusFilter.radiusKm} км</b>. Список отсортирован по расстоянию.
          </div>
        ) : null}

        <div className="summary-strip">
          <div><span>Страница</span><b>{pagination.page} / {pagination.totalPages}</b></div>
          <div><span>Всего найдено</span><b>{totalCount}</b></div>
          <div><span>Активные</span><b>{activeCount}</b></div>
          <div><span>Отменённые</span><b>{cancelledCount}</b></div>
          <div><span>Цена от</span><b>{formatEuro(marketStats.min)}</b></div>
          <div><span>Цена до</span><b>{formatEuro(marketStats.max)}</b></div>
        </div>

        <div className="layout-grid">
          <div>
            <div className="results-head">
              <div>
                <strong>Список объектов</strong>
                <span>Фильтры работают через URL. Список разделён на страницы, а карта может ограничивать выдачу по видимой области.</span>
              </div>
              <SaveSearchButton filtersUrl={filtersUrl} summary={searchSummary} />
            </div>

            {properties.length === 0 ? (
              <EmptyState />
            ) : (
              <>
                <div className="card-list">
                  {properties.map((property) => <PropertyCard key={property.id} property={property} isFavorite={favoriteIds.has(property.id)} />)}
                </div>
                <Pagination
                  params={params}
                  page={pagination.page}
                  totalPages={pagination.totalPages}
                  totalItems={totalCount}
                  fromItem={pagination.fromItem}
                  toItem={pagination.toItem}
                />
              </>
            )}
          </div>

          <PropertyMap properties={mapProperties} />
        </div>
      </section>
    </main>
  );
}
