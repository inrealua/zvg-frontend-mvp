import { stage111NormalizeProperty } from "@/lib/stage111Labels";

type Stage73HeroLocale = "de" | "ru" | "en";

const stage73HeroText: Record<Stage73HeroLocale, { kicker: string; title: string; subtitle: string }> = {
  de: {
    kicker: "ZVG-DE.COM · ALLE GERICHTLICHEN VERSTEIGERUNGEN AN EINEM ORT",
    title: "Professionelles Werkzeug",
    subtitle: "für die Suche nach Zwangsversteigerungen in Deutschland",
  },
  ru: {
    kicker: "ZVG-DE.COM · ВСЕ СУДЕБНЫЕ АУКЦИОНЫ В ОДНОМ МЕСТЕ",
    title: "Профессиональный инструмент",
    subtitle: "для поиска принудительных торгов в Германии",
  },
  en: {
    kicker: "ZVG-DE.COM · ALL JUDICIAL AUCTIONS IN ONE PLACE",
    title: "Professional tool",
    subtitle: "for finding forced auctions in Germany",
  },
};

function stage73Hero(locale: Stage73HeroLocale) {
  return stage73HeroText[locale] || stage73HeroText.de;
}




type Stage70Locale = "de" | "ru" | "en";

const stage70ListText = {
  de: {
    emptyTitle: "{stage70T(locale as Stage70Locale).emptyTitle}",
    emptyText: "{stage70T(locale as Stage70Locale).emptyText}",
    activeFilters: "{stage70T(locale as Stage70Locale).activeFilters}",
    clearAll: "{stage70T(locale as Stage70Locale).clearAll}",
    prev: "Zurück",
    next: "Weiter",
  },
  ru: {
    emptyTitle: "{stage70T(locale as Stage70Locale).emptyTitle}",
    emptyText: "{stage70T(locale as Stage70Locale).emptyText}",
    activeFilters: "{stage70T(locale as Stage70Locale).activeFilters}",
    clearAll: "{stage70T(locale as Stage70Locale).clearAll}",
    prev: "Назад",
    next: "Вперёд",
  },
  en: {
    emptyTitle: "{stage70T(locale as Stage70Locale).emptyTitle}",
    emptyText: "{stage70T(locale as Stage70Locale).emptyText}",
    activeFilters: "Active filters:",
    clearAll: "{stage70T(locale as Stage70Locale).clearAll}",
    prev: "Back",
    next: "Next",
  },
} as const;

function stage70T(locale: Stage70Locale) {
  return stage70ListText[locale] || stage70ListText.de;
}


type Stage69Locale = "de" | "ru" | "en";

const stage69TextDict = {
  de: {
    activeFilters: "{stage70T(locale as Stage70Locale).activeFilters}",
    clearAll: "{stage70T(locale as Stage70Locale).clearAll}",
    emptyTitle: "{stage70T(locale as Stage70Locale).emptyTitle}",
    emptyText: "{stage70T(locale as Stage70Locale).emptyText}",
    prev: "Zurück",
    next: "Weiter",
  },
  ru: {
    activeFilters: "{stage70T(locale as Stage70Locale).activeFilters}",
    clearAll: "{stage70T(locale as Stage70Locale).clearAll}",
    emptyTitle: "{stage70T(locale as Stage70Locale).emptyTitle}",
    emptyText: "{stage70T(locale as Stage70Locale).emptyText}",
    prev: "Назад",
    next: "Вперёд",
  },
  en: {
    activeFilters: "Active filters:",
    clearAll: "{stage70T(locale as Stage70Locale).clearAll}",
    emptyTitle: "{stage70T(locale as Stage70Locale).emptyTitle}",
    emptyText: "{stage70T(locale as Stage70Locale).emptyText}",
    prev: "Back",
    next: "Next",
  },
} as const;

function stage69Text(locale: Stage69Locale = "de") {
  return stage69TextDict[locale] || stage69TextDict.de;
}

import { Prisma, PropertyStatus } from "@prisma/client";
import { ActiveFilters } from "@/components/ActiveFilters";
import { EmptyState } from "@/components/EmptyState";
import { FilterBar } from "@/components/FilterBar";
import { Pagination } from "@/components/Pagination";
import { PropertyCard } from "@/components/PropertyCard";
import { PropertyMap } from "@/components/PropertyMap";
import { SaveSearchButton } from "@/components/SaveSearchButton";
import { SortControls } from "@/components/SortControls";
import { formatEuro, formatNumber } from "@/lib/format";
import { distanceKm, findKnownLocation, type GeoPoint } from "@/lib/geo";
import { resolvePostalCodeCenter } from "@/lib/postal-codes";
import { getI18n } from "@/lib/i18n/server";
import { getSiteText } from "@/lib/i18n/site-text";
import { pickPropertyTranslation, translationInclude } from "@/lib/i18n/property-translations";
import { getPaginationRange } from "@/lib/pagination";
import { pointInPolygon } from "@/lib/polygon";
import { prisma } from "@/lib/prisma";
import {
  asNumber,
  asString,
  buildActiveFilterChips,
  buildPropertyOrderBy,
  buildPropertyWhere,
  parsePolygonParam,
  type SearchParamRecord,
} from "@/lib/search-params";
import { getCurrentUser } from "@/lib/user-auth";

type PageMode = "objects" | "archive" | "map";

type RadiusFilter = {
  center: GeoPoint;
  radiusKm: number;
};

type SiteText = ReturnType<typeof getSiteText>;

const localText = {
  de: {
    archiveKicker: "Archiv · vergangene Termine",
    archiveTitle: "Archiv der Immobilienauktionen",
    archiveText:
      "Abgeschlossene oder archivierte Versteigerungen bleiben separat auffindbar, ohne die aktuelle Suche zu überladen.",
    archiveListTitle: "Archivierte Immobilien",
    archiveListText: "Vergangene Auktionstermine und archivierte Objekte.",
    allObjects: "Alle Objekte",
    radiusNoticePrefix: "Umkreissuche aktiv: Zentrum",
    radiusNoticeMiddle: "Radius",
    radiusNoticeSuffix: "Die Ergebnisse sind nach Entfernung sortiert.",
    polygonNoticePrefix: "Polygon-Suche aktiv: Die Liste zeigt nur Objekte innerhalb der gezeichneten Kartenfläche.",
    polygonPoints: "Polygonpunkte",
  },
  ru: {
    archiveKicker: "Архив · прошедшие торги",
    archiveTitle: "Архив аукционов недвижимости",
    archiveText:
      "Завершённые и архивные торги доступны отдельно, чтобы не перегружать актуальный поиск.",
    archiveListTitle: "Архивные объекты",
    archiveListText: "Прошедшие даты торгов и архивные объекты.",
    allObjects: "Все объекты",
    radiusNoticePrefix: "Активен поиск по радиусу: центр",
    radiusNoticeMiddle: "радиус",
    radiusNoticeSuffix: "Результаты отсортированы по расстоянию.",
    polygonNoticePrefix: "Активен поиск по полигону: список показывает только объекты внутри выделенной области карты.",
    polygonPoints: "Точек полигона",
  },
  en: {
    archiveKicker: "Archive · past auction dates",
    archiveTitle: "Property auction archive",
    archiveText:
      "Completed or archived auctions remain available separately without overloading the current search.",
    archiveListTitle: "Archived properties",
    archiveListText: "Past auction dates and archived properties.",
    allObjects: "All properties",
    radiusNoticePrefix: "Radius search active: center",
    radiusNoticeMiddle: "radius",
    radiusNoticeSuffix: "Results are sorted by distance.",
    polygonNoticePrefix: "Polygon search active: the list shows only properties inside the drawn map area.",
    polygonPoints: "Polygon points",
  },
} as const;

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
      { status: { in: [PropertyStatus.ARCHIVED, PropertyStatus.SOLD] } },
    ],
  };

  const currentRule: Prisma.PropertyWhereInput = {
    AND: [
      { status: { notIn: [PropertyStatus.ARCHIVED, PropertyStatus.SOLD] } },
      {
        OR: [
          { auctionDate: null },
          { auctionDate: { gte: today } },
        ],
      },
    ],
  };

  return {
    AND: [where, mode === "archive" ? archiveRule : currentRule],
  };
}

async function resolveRadiusFilter(params: SearchParamRecord): Promise<RadiusFilter | null> {
  const location = asString(params.postalCode) || asString(params.city);
  const radiusKm = asNumber(params.radiusKm);

  if (!location || !radiusKm || radiusKm <= 0) return null;

  const postalCodeCenter = await resolvePostalCodeCenter(location);
  if (postalCodeCenter) {
    return { center: postalCodeCenter, radiusKm };
  }

  const knownLocation = findKnownLocation(location);
  if (knownLocation) {
    return { center: knownLocation, radiusKm };
  }

  const propertyWithCoordinates = await prisma.property.findFirst({
    where: {
      OR: [
        { city: { contains: location } },
        { postalCode: { startsWith: location } },
        { address: { contains: location } },
      ],
      latitude: { not: null },
      longitude: { not: null },
    },
    select: {
      city: true,
      postalCode: true,
      latitude: true,
      longitude: true,
    },
    orderBy: { updatedAt: "desc" },
  });

  if (!propertyWithCoordinates?.latitude || !propertyWithCoordinates?.longitude) return null;

  return {
    center: {
      latitude: propertyWithCoordinates.latitude,
      longitude: propertyWithCoordinates.longitude,
      label: `${propertyWithCoordinates.city} ${propertyWithCoordinates.postalCode}`.trim(),
    },
    radiusKm,
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

function pageCopy(mode: PageMode, siteText: SiteText, locale: keyof typeof localText) {
  const t = localText[locale];

  if (mode === "archive") {
    return {
      kicker: t.archiveKicker,
      title: stage73Hero(locale as Stage73HeroLocale).title,
      text: stage73Hero(locale as Stage73HeroLocale).subtitle,
      listTitle: "",
      listText: "",
    };
  }

  if (mode === "map") {
    return {
      kicker: siteText.hero.kickerMap,
      title: stage73Hero(locale as Stage73HeroLocale).title,
      text: stage73Hero(locale as Stage73HeroLocale).subtitle,
      listTitle: "",
      listText: "",
    };
  }

  return {
    kicker: siteText.hero.kickerHome,
    title: stage73Hero(locale as Stage73HeroLocale).title,
    text: stage73Hero(locale as Stage73HeroLocale).subtitle,
    listTitle: "",
    listText: "",
  };
}

export async function PublicPropertiesPage({
  params,
  mode,
  forcedLocale,
}: {
  params: SearchParamRecord;
  mode: PageMode;

  forcedLocale?: "de" | "ru" | "en";}) {
  const allowedPageSizesV57 = [12, 24, 48, 96];
  const i18n = await getI18n();
  const locale = forcedLocale ?? i18n.locale;
  const siteText = getSiteText(locale);
  const t = localText[locale];

  const radiusFilter = await resolveRadiusFilter(params);
  const paramsForWhere = radiusFilter ? { ...params, postalCode: undefined, city: undefined } : params;
  const baseWhere = buildPropertyWhere(paramsForWhere);
  const where = withArchiveMode(baseWhere, mode);
  const orderBy = buildPropertyOrderBy(params);
  const activeChips = buildActiveFilterChips(params).filter((chip) => chip.key !== "perPage" && chip.key !== "sort");
  const currentUser = await getCurrentUser();
  const requestedPage = Math.max(1, asNumber(params.page) || 1);
  const requestedPerPage = asNumber(params.perPage) || 12;
  const paginationState = {
    page: requestedPage,
    perPage: allowedPageSizesV57.includes(requestedPerPage) ? requestedPerPage : 12,
  };
  const polygonPoints = parsePolygonParam(params.poly);
  const copy = pageCopy(mode, siteText, locale);

  const [rawProperties, statesRaw, courtsRaw, citiesRaw, allCount, archiveCount] = await Promise.all([
    prisma.property.findMany({
      where,
      include: {
        ...translationInclude(locale),
        images: {
          orderBy: [{ isMain: "desc" }, { sortOrder: "asc" }],
          },
      },
      orderBy,
    }),
    prisma.property.findMany({ 
      select: { state: true }, distinct: ["state"], orderBy: { state: "asc" } }),
    prisma.property.findMany({ select: { court: true }, distinct: ["court"], orderBy: { court: "asc" } }),
    prisma.property.findMany({ select: { city: true }, distinct: ["city"], orderBy: { city: "asc" } }),
    prisma.property.count(),
    prisma.property.count({ where: withArchiveMode({}, "archive") }),
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
              longitude: property.longitude,
            }),
          };
        })
        .filter((item) => item.distance !== null && item.distance <= radiusFilter.radiusKm)
        .sort((a, b) => (a.distance ?? 0) - (b.distance ?? 0))
    : rawProperties.map((property) => ({ property, distance: null as number | null }));

  const propertiesWithPolygon =
    polygonPoints.length >= 3
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
  const properties = paginatedProperties;
  const allFilteredProperties = propertiesWithPolygon.map((item) => item.property);
  const marketStats = calculateMarketStats(allFilteredProperties);

  const states = statesRaw.map((item) => item.state);
  const courts = courtsRaw.map((item) => item.court);
  const cities = citiesRaw.map((item) => item.city);
  const activeCount = allFilteredProperties.filter((property) => property.status === "ACTIVE").length;
  const cancelledCount = allFilteredProperties.filter((property) => property.status === "CANCELLED").length;

  const mapProperties = allFilteredProperties.map((property) => {
    const translated = pickPropertyTranslation(property, locale);

    return {
      id: property.id,
      title: stage73Hero(locale as Stage73HeroLocale).title,
      address: property.address,
      latitude: property.latitude,
      longitude: property.longitude,
      status: property.status,
      propertyTypeGroup: property.propertyTypeGroup,
      city: property.city,
      marketValue: property.marketValue,
      auctionDate: property.auctionDate ? property.auctionDate.toISOString() : null,
      imageUrl: property.images[0]?.url ?? null,
    };
  });

  const favoriteRows = currentUser
    ? await prisma.favorite.findMany({
        where: { userId: currentUser.id, propertyId: { in: properties.map((property) => property.id) } },
        select: { propertyId: true },
      })
    : [];

  const favoriteIds = new Set(favoriteRows.map((favorite) => favorite.propertyId));
  const filtersUrl = buildCurrentFiltersUrl(params, mode);
  const searchSummary = activeChips.length > 0 ? activeChips.map((chip) => chip.label).join(" · ") : t.allObjects;

  const filterBlock = <FilterBar states={states} courts={courts} cities={cities} compact={mode === "map"} />;
  const activeFilterBlock = <ActiveFilters chips={activeChips} />;

  const resetHref = pagePathForMode(mode);

  const activeFiltersMapToolbar = (
    <div className="map-active-filter-toolbar-v49">
      <div className="map-active-filter-toolbar-inner-v49">
        {activeFilterBlock}
      </div>
      <a className="btn btn-soft" href={resetHref}>Filter zurücksetzen</a>
    </div>
  );

  const notices = (
    <>
      {radiusFilter ? (
        <div className="notice-bar">
          {t.radiusNoticePrefix} <b>{radiusFilter.center.label}</b>, {t.radiusNoticeMiddle}{" "}
          <b>{radiusFilter.radiusKm} km</b>. {t.radiusNoticeSuffix}
        </div>
      ) : null}

      {polygonPoints.length >= 3 ? (
        <div className="notice-bar">
          {t.polygonNoticePrefix} {t.polygonPoints}: <b>{polygonPoints.length}</b>.
        </div>
      ) : null}
    </>
  );

  const summary = (
    <div className="summary-strip">
      <div><span>{siteText.map.page}</span><b>{pagination.page} / {pagination.totalPages}</b></div>
      <div><span>{siteText.map.found}</span><b>{totalCount}</b></div>
      <div><span>{siteText.map.active}</span><b>{activeCount}</b></div>
      <div><span>{siteText.map.cancelled}</span><b>{cancelledCount}</b></div>
      <div><span>{siteText.map.archive}</span><b>{archiveCount}</b></div>
      <div><span>{siteText.map.maxValue}</span><b>{formatEuro(marketStats.max)}</b></div>
    </div>
  );

  const list = (
    <div>
      <div className="results-head">
        <div>
          <strong>{copy.listTitle}</strong>
          <span>{copy.listText}</span>
        </div>
        <div className="results-actions-v54">
          <SortControls />
          {mode !== "objects" ? <SaveSearchButton filtersUrl={filtersUrl} summary={searchSummary} /> : null}
        </div>
      </div>

      {properties.length === 0 ? (
        <EmptyState />
      ) : (
        <>
          <div className={mode === "objects" ? "card-list home-property-grid" : "card-list"}>
            {properties.map((property) => (
              <PropertyCard
                key={property.id}
                property={property}
                locale={locale}
                isFavorite={favoriteIds.has(property.id)}
              />
            ))}
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
                <span>{siteText.hero.checkedSources}</span>
                <span>{siteText.hero.dailyUpdated}</span>
                <span>{siteText.hero.nationwide}</span>
              </div>
            </div>
            <div className="hero-stats">
              <div><span>{formatNumber(allCount)}</span><b>{siteText.hero.objectsInDatabase}</b></div>
              <div><span>{formatNumber(totalCount)}</span><b>{siteText.hero.objectsOnMap}</b></div>
              <div><span>{formatEuro(marketStats.avg)}</span><b>{siteText.hero.averageMarketValue}</b></div>
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
              {activeFiltersMapToolbar}
              <PropertyMap properties={mapProperties} variant="large" />
              {list}
            </div>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="zvg-search-page-v54">
      <section className="hero search-hero-v54">
        <div className="container search-hero-inner-v54">
          <div>
            <p className="hero-kicker">{copy.kicker}</p>
            <h1>{copy.title}</h1>
            <p>{copy.text}</p>
            <div className="hero-trust-row">
              <span>{siteText.hero.checkedSources}</span>
              <span>{siteText.hero.dailyUpdated}</span>
              <span>{siteText.hero.nationwide}</span>
            </div>
          </div>
          <div className="hero-stats hero-stats-v54">
            <div><span>{formatNumber(allCount)}</span><b>{siteText.hero.objectsInDatabase}</b></div>
            <div><span>{formatNumber(totalCount)}</span><b>{siteText.hero.objectsOnMap}</b></div>
            <div><span>{formatEuro(marketStats.avg)}</span><b>{siteText.hero.averageMarketValue}</b></div>
          </div>
        </div>
      </section>

      <section className="container page-section unified-search-page-v54">
        <div className="horizontal-filter-shell-v54">
          {filterBlock}
        </div>

        {activeFilterBlock}
        {notices}
        {summary}

        <div className="search-map-section-v60">
          <PropertyMap properties={mapProperties} variant="wide" />
        </div>

        <div className="search-results-grid-section-v54">
          {list}
        </div>
      </section>
    </main>
  );
}
