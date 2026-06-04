import { getPublicUi } from "@/lib/i18n/property-labels";
import { translationInclude } from "@/lib/i18n/property-translations";
import { getI18n } from "@/lib/i18n/server";
import { Prisma, PropertyStatus } from "@prisma/client";
import { ActiveFilters } from "@/components/ActiveFilters";
import { EmptyState } from "@/components/EmptyState";
import { FilterBar } from "@/components/FilterBar";
import { PropertyCard } from "@/components/PropertyCard";
import { PropertyMap } from "@/components/PropertyMap";
import { QuickSearchBar } from "@/components/QuickSearchBar";
import { Pagination } from "@/components/Pagination";
import { SaveSearchButton } from "@/components/SaveSearchButton";
import { prisma } from "@/lib/prisma";
import { asNumber, asString, buildActiveFilterChips, buildPropertyOrderBy, buildPropertyWhere, parsePolygonParam, type SearchParamRecord } from "@/lib/search-params";
import { formatEuro, formatNumber } from "@/lib/format";
import { getCurrentUser } from "@/lib/user-auth";
import { distanceKm, findKnownLocation, type GeoPoint } from "@/lib/geo";
import { getPaginationRange, getPaginationState } from "@/lib/pagination";
import { pointInPolygon } from "@/lib/polygon";

type PageMode = "objects" | "archive" | "map";

type RadiusFilter = {
  center: GeoPoint;
  radiusKm: number;
};

function pagePathForMode(mode: PageMode): string {
  if (mode === "archive") return "/archive";
  if (mode === "map") return "/map";
  return "/";
}

function buildCurrentFiltersUrl(params: SearchParamRecord, mode: PageMode): string {
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
  const path = pagePathForMode(mode);
  return query ? `${path}?${query}` : path;
}

function todayStart(): Date {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
}

function withArchiveMode(where: Prisma.PropertyWhereInput, mode: PageMode): Prisma.PropertyWhereInput {
  const today = todayStart();

  const archiveRule: Prisma.PropertyWhereInput = {
    OR: [
      { auctionDate: { lt: today } },
      { status: { in: [PropertyStatus.ARCHIVED, PropertyStatus.SOLD] } }
    ]
  };

  const currentRule: Prisma.PropertyWhereInput = {
    AND: [
      { status: { notIn: [PropertyStatus.ARCHIVED, PropertyStatus.SOLD] } },
      {
        OR: [
          { auctionDate: null },
          { auctionDate: { gte: today } }
        ]
      }
    ]
  };

  return {
    AND: [where, mode === "archive" ? archiveRule : currentRule]
  };
}

async function resolveRadiusFilter(params: SearchParamRecord): Promise<RadiusFilter | null> {
  const location = asString(params.postalCode) || asString(params.city);
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

function pageCopy(mode: PageMode) {
  if (mode === "archive") {
    return {
      kicker: "Archiv · vergangene Termine",
      title: "Archiv der Immobilienauktionen",
      text: "Abgeschlossene oder archivierte Versteigerungen bleiben separat auffindbar, ohne die aktuelle Suche zu überladen.",
      listTitle: "Archivierte Immobilien",
      listText: "Vergangene Auktionstermine und archivierte Objekte."
    };
  }

  if (mode === "map") {
    return {
      kicker: "Karte · Deutschlandweit suchen",
      title: "Gerichtliche Versteigerungen auf der Karte finden",
      text: "Suchen Sie nach Regionen, Gerichten, Preisen und Objektarten. Die Karte unterstützt Gebietssuche und Polygon-Auswahl.",
      listTitle: "Objekte auf der Karte",
      listText: "Die Liste entspricht denselben Filtern wie die Kartenansicht."
    };
  }

  return {
    kicker: "zvg-de.com · gerichtliche Versteigerungen",
    title: "Top 12 aktuelle Objekte",
    text: "Kurze Auswahl für die Startseite. Die vollständige Recherche finden Sie in der erweiterten Suche.",
    listTitle: "Top 12 aktuelle Objekte",
    listText: "Kurze Auswahl für die Startseite. Die vollständige Recherche finden Sie in der erweiterten Suche."
  };
}

export async function PublicPropertiesPage({ params, mode }: { params: SearchParamRecord; mode: PageMode }) {
  const { locale } = await getI18n();
  const publicUi = getPublicUi(locale);
  const baseWhere = buildPropertyWhere(params);
  const where = withArchiveMode(baseWhere, mode);
  const orderBy = buildPropertyOrderBy(params);
  const activeChips = buildActiveFilterChips(params);
  const currentUser = await getCurrentUser();
  const radiusFilter = await resolveRadiusFilter(params);
  const paginationState = getPaginationState(params);
  const polygonPoints = parsePolygonParam(params.poly);
  const copy = pageCopy(mode);

  const [rawProperties, statesRaw, courtsRaw, citiesRaw, allCount, archiveCount] = await Promise.all([
    prisma.property.findMany({
      where,
      include: { ...translationInclude(locale), images: {
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
    prisma.property.count(),
    prisma.property.count({ where: withArchiveMode({}, "archive") })
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

  const propertiesWithPolygon = polygonPoints.length >= 3
    ? propertiesWithDistance.filter((item) => {
        const latitude = item.property.latitude;
        const longitude = item.property.longitude;

        if (typeof latitude !== "number" || typeof longitude !== "number") return false;

        return pointInPolygon({ latitude, longitude }, polygonPoints);
      })
    : propertiesWithDistance;

  const totalCount = propertiesWithPolygon.length;
  const pagination = getPaginationRange(totalCount, paginationState);
  const paginatedProperties = propertiesWithPolygon
    .slice(pagination.startIndex, pagination.endIndex)
    .map((item) => item.property);
  const topHomeProperties = propertiesWithPolygon
    .slice(0, 12)
    .map((item) => item.property);
  const properties = mode === "objects" ? topHomeProperties : paginatedProperties;
  const allFilteredProperties = propertiesWithPolygon.map((item) => item.property);
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
  const filtersUrl = buildCurrentFiltersUrl(params, mode);
  const searchSummary = activeChips.length > 0 ? activeChips.map((chip) => chip.label).join(" · ") : "Alle Objekte";

  const filterBlock = <FilterBar states={states} courts={courts} cities={cities} compact={mode === "map"} />;
  const activeFilterBlock = <ActiveFilters chips={activeChips} />;

  const notices = (
    <>
      {radiusFilter ? (
        <div className="notice-bar">
          Umkreissuche aktiv: Zentrum <b>{radiusFilter.center.label}</b>, Radius <b>{radiusFilter.radiusKm} km</b>. Die Ergebnisse sind nach Entfernung sortiert.
        </div>
      ) : null}

      {polygonPoints.length >= 3 ? (
        <div className="notice-bar">
          Polygon-Suche aktiv: Die Liste zeigt nur Objekte innerhalb der gezeichneten Kartenfläche. Polygonpunkte: <b>{polygonPoints.length}</b>.
        </div>
      ) : null}
    </>
  );

  const summary = (
    <div className="summary-strip">
      <div><span>Seite</span><b>{pagination.page} / {pagination.totalPages}</b></div>
      <div><span>Gefunden</span><b>{totalCount}</b></div>
      <div><span>Aktiv</span><b>{activeCount}</b></div>
      <div><span>Aufgehoben</span><b>{cancelledCount}</b></div>
      <div><span>Archiv</span><b>{archiveCount}</b></div>
      <div><span>Max. Wert</span><b>{formatEuro(marketStats.max)}</b></div>
    </div>
  );

  const list = (
    <div>
      <div className="results-head">
        <div>
          <strong>{copy.listTitle}</strong>
          <span>{copy.listText}</span>
        </div>
        {mode === "objects" ? <a className="text-link" href="/map">{publicUi.advancedSearch}</a> : <SaveSearchButton filtersUrl={filtersUrl} summary={searchSummary} />}
      </div>

      {properties.length === 0 ? (
        <EmptyState />
      ) : (
        <>
          <div className={mode === "objects" ? "card-list home-property-grid" : "card-list"}>
            {properties.map((property) => <PropertyCard key={property.id} property={property} locale={locale} isFavorite={favoriteIds.has(property.id)} />)}
          </div>
          {mode !== "objects" ? (
            <Pagination
              params={params}
              page={pagination.page}
              totalPages={pagination.totalPages}
              totalItems={totalCount}
              fromItem={pagination.fromItem}
              toItem={pagination.toItem}
            />
          ) : null}
        </>
      )}
    </div>
  );

  if (mode === "map") {
    return (
      <main>
        <section className="hero compact-hero">
          <div className="container hero-grid">
            <div>
              <p className="hero-kicker">{copy.kicker}</p>
              <h1>{copy.title}</h1>
              <p>{copy.text}</p>
              <div className="hero-trust-row">
                <span>Geprüfte Quellen</span>
                <span>Täglich aktualisiert</span>
                <span>Deutschlandweit</span>
              </div>
            </div>
            <div className="hero-stats">
              <div><span>{formatNumber(allCount)}</span><b>Immobilien in der Datenbank</b></div>
              <div><span>{formatNumber(totalCount)}</span><b>auf der Karte</b></div>
              <div><span>{formatEuro(marketStats.avg)}</span><b>Ø Verkehrswert</b></div>
            </div>
          </div>
        </section>

        <section className="container page-section map-search-page">
          <div className="map-page-grid">
            <aside className="map-filter-sidebar">
              {filterBlock}
              {activeFilterBlock}
              {notices}
            </aside>
            <div className="map-page-main">
              {summary}
              <PropertyMap properties={mapProperties} variant="large" />
              {list}
            </div>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main>
      <section className="hero">
        <div className="container hero-grid">
          <div>
            <p className="hero-kicker">{copy.kicker}</p>
            <h1>{copy.title}</h1>
            <p>{copy.text}</p>
          </div>
          <div className="hero-stats">
            <div><span>{formatNumber(allCount)}</span><b>Objekte in der Datenbank</b></div>
            <div><span>16</span><b>Bundesländer</b></div>
            <div><span>100%</span><b>kostenlos suchen</b></div>
          </div>
        </div>
      </section>

      <section className="container page-section home-search-section">
        <QuickSearchBar states={states} />
        {activeFilterBlock}
        {notices}

        <div className="home-map-block">
          <div className="section-heading-row">
            <div>
              <strong>Versteigerungen auf der Karte</strong>
              <span>Ein schneller Überblick. Die große Karte mit allen Filtern finden Sie im Bereich Karte.</span>
            </div>
            <a className="btn btn-soft" href="/map">Große Karte öffnen</a>
          </div>
          <PropertyMap properties={mapProperties} variant="wide" />
        </div>

        <div className="home-top-objects">
          {summary}
          {list}
        </div>
      </section>
    </main>
  );
}
