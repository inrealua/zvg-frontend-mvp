import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { FavoriteButton } from "@/components/FavoriteButton";
import { PropertyDetailActions } from "@/components/PropertyDetailActions";
import { PropertyDetailMap } from "@/components/PropertyDetailMap";
import { PropertyGallery } from "@/components/PropertyGallery";
import { prisma } from "@/lib/prisma";
import {
  formatArea,
  formatDateTime,
  formatEuro,
  shortAddress,
  statusClass,
  translateGroup,
  translateOccupancy,
  translateStatus,
} from "@/lib/format";
import { getCurrentUser } from "@/lib/user-auth";
import { getI18n } from "@/lib/i18n/server";
import {
  getPropertyUi,
  pickPropertyTranslation,
  translationInclude,
} from "@/lib/i18n/property-translations";

export const dynamic = "force-dynamic";

type PropertyPageProps = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({ params }: PropertyPageProps): Promise<Metadata> {
  const { id } = await params;
  const property = await prisma.property.findUnique({
    where: { id },
    include: {
      translations: true,
      images: {
        where: { isMain: true },
        select: { url: true },
        take: 1,
      },
    },
  });

  if (!property) {
    return {
      title: "Objekt nicht gefunden",
      robots: { index: false, follow: false },
    };
  }

  const translated = pickPropertyTranslation(property, "de");
  const priceText = property.marketValue ? ` · Verkehrswert ${property.marketValue.toLocaleString("de-DE")} €` : "";
  const title = `${translated.propertyType || property.propertyType} in ${property.city}`;
  const description = `${translated.title} · ${property.address}${priceText}`;
  const imageUrl = property.images[0]?.url;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "article",
      images: imageUrl ? [{ url: imageUrl }] : undefined,
    },
    twitter: {
      card: imageUrl ? "summary_large_image" : "summary",
      title,
      description,
      images: imageUrl ? [imageUrl] : undefined,
    },
  };
}

function formatDocumentType(type: string, locale: string): string {
  const labels: Record<string, Record<string, string>> = {
    GUTACHTEN: { de: "Gutachten", ru: "Оценочный отчёт", en: "Valuation report" },
    BEKANNTMACHUNG: { de: "Bekanntmachung", ru: "Официальное объявление", en: "Official notice" },
    EXPOSE: { de: "Exposé", ru: "Экспозе", en: "Exposé" },
    FOTO: { de: "Foto", ru: "Фото", en: "Photo" },
    OTHER: { de: "Sonstiges Dokument", ru: "Другой документ", en: "Other document" },
  };

  return labels[type]?.[locale] ?? type;
}

export default async function PropertyPage({ params }: PropertyPageProps) {

  const { id } = await params;
  const { locale, t } = await getI18n();
  const ui = getPropertyUi(locale);

  const property = await prisma.property.findUnique({
    where: { id },
    include: {
      ...translationInclude(locale),
      images: { orderBy: [{ isMain: "desc" }, { sortOrder: "asc" }, { createdAt: "asc" }] },
      documents: { orderBy: [{ documentType: "asc" }, { createdAt: "asc" }] },
    },
  });

  if (!property) notFound();

  const translated = pickPropertyTranslation(property, locale);

  const currentUser = await getCurrentUser();
  const favorite = currentUser
    ? await prisma.favorite.findUnique({
        where: { userId_propertyId: { userId: currentUser.id, propertyId: property.id } },
      })
    : null;

  return (
    <main className="detail-page">
      <div className="container">
        <div className="breadcrumbs">
          <Link href="/">{t.nav.home}</Link>
          <span>{property.city}</span>
          <span>Az. {property.aktenzeichen}</span>
        </div>

        <section className="detail-hero panel">
          <div className="detail-topbar">
            <div className="detail-title-wrap">
              <p className="eyebrow">{translateGroup(property.propertyTypeGroup)} · {translated.propertyType || property.propertyType}</p>
              <h1>{translated.title}</h1>
              <p className="detail-address">{shortAddress(property.address)}</p>
              <div className="detail-actions">
                <span className={`status-badge ${statusClass(property.status)}`}>{translateStatus(property.status)}</span>
                <span className="status-badge">{property.state}</span>
                <span className="status-badge">{property.court}</span>
              </div>
            </div>
            <div className="detail-price-card">
              <span>{ui.marketValue}</span>
              <strong>{formatEuro(property.marketValue)}</strong>
              <span>{formatDateTime(property.auctionDate, property.auctionTime)}</span>
            </div>
          </div>

          <div className="detail-actions">
            <FavoriteButton propertyId={property.id} initialIsFavorite={Boolean(favorite)} />
          </div>
          <PropertyDetailActions title={translated.title} />
        </section>

        <nav className="quick-nav" aria-label="Detail navigation">
          <a href="#gallery">{locale === "ru" ? "Фото" : locale === "en" ? "Photos" : "Fotos"}</a>
          <a href="#description">{ui.description}</a>
          <a href="#auction">{ui.auction}</a>
          <a href="#features">{ui.features}</a>
          <a href="#map">{ui.map}</a>
          <a href="#documents">{ui.documents}</a>
        </nav>

        <div className="detail-summary-grid">
          <div className="summary-tile"><span>{ui.auctionDate}</span><b>{formatDateTime(property.auctionDate, property.auctionTime)}</b></div>
          <div className="summary-tile"><span>{ui.livingArea}</span><b>{formatArea(property.livingArea)}</b></div>
          <div className="summary-tile"><span>{ui.plotArea}</span><b>{formatArea(property.plotArea)}</b></div>
          <div className="summary-tile"><span>{ui.use}</span><b>{translateOccupancy(property.occupancyStatus)}</b></div>
        </div>

        <div className="detail-grid">
          <section className="panel">
            <PropertyGallery
              title={translated.title}
              images={property.images.map((image) => ({ id: image.id, url: image.url, alt: image.alt }))}
            />

            <div className="info-section" id="description">
              <h2>{ui.description}</h2>
              <p className="description">{translated.description}</p>
            </div>

            {translated.locationDescription ? (
              <div className="info-section">
                <h2>{ui.location}</h2>
                <p className="description">{translated.locationDescription}</p>
              </div>
            ) : null}

            {property.cancellationText ? (
              <div className="warning-box">
                <b>{ui.cancelled}</b>
                <p>{property.cancellationText}</p>
              </div>
            ) : null}

            <div className="info-section" id="documents">
              <h2>{ui.documents}</h2>
              {property.documents.length === 0 ? (
                <p className="meta">{ui.noDocuments}</p>
              ) : (
                <table className="document-table">
                  <thead>
                    <tr>
                      <th>{ui.type}</th>
                      <th>{ui.file}</th>
                      <th>{ui.action}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {property.documents.map((document) => (
                      <tr key={document.id}>
                        <td>{formatDocumentType(document.documentType, locale)}</td>
                        <td>{document.filename}</td>
                        <td><a className="document-link" href={document.url} target="_blank" rel="noreferrer">{ui.open}</a></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </section>

          <aside className="detail-sidebar">
            <section className="panel" id="auction">
              <h2>{ui.auction}</h2>
              <div className="specs">
                <div className="spec"><span>{ui.auctionDate}</span><b>{formatDateTime(property.auctionDate, property.auctionTime)}</b></div>
                <div className="spec"><span>{ui.auctionLocation}</span><b>{property.auctionLocation ?? ui.unknown}</b></div>
                <div className="spec"><span>{ui.court}</span><b>{property.court}</b></div>
                <div className="spec"><span>Aktenzeichen</span><b>{property.aktenzeichen}</b></div>
                <div className="spec"><span>{ui.attempt}</span><b>{property.auctionAttempt}</b></div>
                <div className="spec"><span>{ui.valueLimits}</span><b>{property.wertgrenzenWeggefallen ? ui.valueLimitsGone : ui.valueLimitsNotGone}</b></div>
              </div>
            </section>

            <section className="panel" id="features">
              <h2>{ui.features}</h2>
              <div className="specs">
                <div className="spec"><span>{ui.address}</span><b>{property.address}</b></div>
                <div className="spec"><span>{ui.federalState}</span><b>{property.state}</b></div>
                <div className="spec"><span>PLZ / Ort</span><b>{property.postalCode} {property.city}</b></div>
                <div className="spec"><span>{ui.livingArea}</span><b>{formatArea(property.livingArea)}</b></div>
                <div className="spec"><span>Nutzfläche</span><b>{formatArea(property.usableArea)}</b></div>
                <div className="spec"><span>Gesamtfläche</span><b>{formatArea(property.totalArea)}</b></div>
                <div className="spec"><span>{ui.plotArea}</span><b>{formatArea(property.plotArea)}</b></div>
                <div className="spec"><span>{ui.constructionYear}</span><b>{property.yearBuilt ?? ui.unknown}</b></div>
                <div className="spec"><span>{ui.use}</span><b>{translateOccupancy(property.occupancyStatus)}</b></div>
                <div className="spec"><span>{ui.heritage}</span><b>{property.hasDenkmalschutz ? ui.yes : ui.no}</b></div>
              </div>
            </section>

            <section className="panel" id="map">
              <h2>{ui.map}</h2>
              <PropertyDetailMap
                property={{
                  id: property.id,
                  title: translated.title,
                  address: property.address,
                  latitude: property.latitude,
                  longitude: property.longitude,
                  status: property.status,
                  propertyTypeGroup: property.propertyTypeGroup,
                  city: property.city,
                  marketValue: property.marketValue,
                }}
              />
              <p className="meta">{ui.coordinates}: {property.latitude?.toFixed(4) ?? ui.unknown}, {property.longitude?.toFixed(4) ?? ui.unknown}</p>
            </section>

            <section className="panel source-box">
              <h2>{ui.sourceInfo}</h2>
              <div className="specs">
                <div className="spec"><span>{ui.sourceInfo}</span><b>{property.source}</b></div>
                <div className="spec"><span>{locale === "ru" ? "Последнее обновление" : locale === "en" ? "Last update" : "Letzte Aktualisierung"}</span><b>{property.lastSourceUpdate ? property.lastSourceUpdate.toLocaleDateString(locale === "ru" ? "ru-RU" : locale === "en" ? "en-US" : "de-DE") : ui.unknown}</b></div>
                <div className="spec"><span>{locale === "ru" ? "Ссылка" : locale === "en" ? "Link" : "Link"}</span><b>{property.sourceUrl ? <a href={property.sourceUrl} target="_blank" rel="noreferrer">{ui.open}</a> : ui.unknown}</b></div>
              </div>
            </section>
          </aside>
        </div>
      </div>
    </main>
  );
}
