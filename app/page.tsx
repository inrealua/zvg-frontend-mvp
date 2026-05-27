import { OccupancyStatus, Prisma, PropertyStatus, PropertyTypeGroup } from "@prisma/client";
import { FilterBar } from "@/components/FilterBar";
import { PropertyCard } from "@/components/PropertyCard";
import { PropertyMap } from "@/components/PropertyMap";
import { prisma } from "@/lib/prisma";

type HomeSearchParams = Promise<Record<string, string | string[] | undefined>>;

export const dynamic = "force-dynamic";

function asString(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
}

function asNumber(value: string | string[] | undefined): number | undefined {
  const text = asString(value);
  if (!text) return undefined;
  const parsed = Number(text);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function buildWhere(params: Record<string, string | string[] | undefined>): Prisma.PropertyWhereInput {
  const q = asString(params.q);
  const state = asString(params.state);
  const city = asString(params.city);
  const court = asString(params.court);
  const typeGroup = asString(params.typeGroup);
  const status = asString(params.status);
  const occupancy = asString(params.occupancy);
  const minPrice = asNumber(params.minPrice);
  const maxPrice = asNumber(params.maxPrice);
  const minArea = asNumber(params.minArea);
  const denkmalschutz = asString(params.denkmalschutz);
  const wertgrenzen = asString(params.wertgrenzen);

  const where: Prisma.PropertyWhereInput = {};

  if (q) {
    where.OR = [
      { title: { contains: q } },
      { address: { contains: q } },
      { city: { contains: q } },
      { aktenzeichen: { contains: q } },
      { court: { contains: q } }
    ];
  }

  if (state) where.state = state;
  if (city) where.city = city;
  if (court) where.court = court;
  if (typeGroup) where.propertyTypeGroup = typeGroup as PropertyTypeGroup;
  if (status) where.status = status as PropertyStatus;
  if (occupancy) where.occupancyStatus = occupancy as OccupancyStatus;

  if (minPrice !== undefined || maxPrice !== undefined) {
    const marketValueFilter: Prisma.IntNullableFilter = {};
    if (minPrice !== undefined) marketValueFilter.gte = minPrice;
    if (maxPrice !== undefined) marketValueFilter.lte = maxPrice;
    where.marketValue = marketValueFilter;
  }

  if (minArea !== undefined) {
    const livingAreaFilter: Prisma.FloatNullableFilter = { gte: minArea };
    where.livingArea = livingAreaFilter;
  }
  if (denkmalschutz === "yes") where.hasDenkmalschutz = true;
  if (denkmalschutz === "no") where.hasDenkmalschutz = false;
  if (wertgrenzen === "yes") where.wertgrenzenWeggefallen = true;
  if (wertgrenzen === "no") where.wertgrenzenWeggefallen = false;

  return where;
}

export default async function HomePage({ searchParams }: { searchParams: HomeSearchParams }) {
  const params = await searchParams;
  const where = buildWhere(params);

  const [properties, statesRaw, courtsRaw, citiesRaw, totalCount] = await Promise.all([
    prisma.property.findMany({
      where,
      include: {
        images: {
          orderBy: [{ isMain: "desc" }, { sortOrder: "asc" }],
          take: 1
        }
      },
      orderBy: [
        { status: "asc" },
        { auctionDate: "asc" },
        { marketValue: "asc" }
      ],
      take: 200
    }),
    prisma.property.findMany({ select: { state: true }, distinct: ["state"], orderBy: { state: "asc" } }),
    prisma.property.findMany({ select: { court: true }, distinct: ["court"], orderBy: { court: "asc" } }),
    prisma.property.findMany({ select: { city: true }, distinct: ["city"], orderBy: { city: "asc" } }),
    prisma.property.count({ where })
  ]);

  const states = statesRaw.map((item) => item.state);
  const courts = courtsRaw.map((item) => item.court);
  const cities = citiesRaw.map((item) => item.city);

  return (
    <main>
      <section className="hero">
        <div className="container">
          <h1>Объекты судебных торгов Германии</h1>
          <p>
            MVP-версия: данные берутся напрямую из MySQL через Prisma. Парсеры, AI-анализ,
            личный кабинет и админка будут добавлены следующими этапами.
          </p>
        </div>
      </section>

      <section className="container">
        <FilterBar states={states} courts={courts} cities={cities} />

        <div className="layout-grid">
          <div>
            <div className="results-head">
              <strong>Найдено объектов: {totalCount}</strong>
              <span>Показано: {properties.length}</span>
            </div>

            {properties.length === 0 ? (
              <div className="empty">По выбранным фильтрам объектов не найдено.</div>
            ) : (
              <div className="card-list">
                {properties.map((property) => <PropertyCard key={property.id} property={property} />)}
              </div>
            )}
          </div>

          <PropertyMap properties={properties} />
        </div>
      </section>
    </main>
  );
}
