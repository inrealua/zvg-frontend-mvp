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
  translateStatus
} from "@/lib/format";
import { getCurrentUser } from "@/lib/user-auth";

export const dynamic = "force-dynamic";

type PropertyPageProps = {
  params: Promise<{ id: string }>;
};

function yesNo(value: boolean): string {
  return value ? "Да" : "Нет";
}

function formatDocumentType(type: string): string {
  const labels: Record<string, string> = {
    GUTACHTEN: "Gutachten / оценочный отчёт",
    BEKANNTMACHUNG: "Bekanntmachung / объявление суда",
    EXPOSE: "Exposé",
    FOTO: "Фото / архив",
    OTHER: "Другой документ"
  };

  return labels[type] ?? type;
}

export default async function PropertyPage({ params }: PropertyPageProps) {
  const { id } = await params;
  const property = await prisma.property.findUnique({
    where: { id },
    include: {
      images: { orderBy: [{ isMain: "desc" }, { sortOrder: "asc" }, { createdAt: "asc" }] },
      documents: { orderBy: [{ documentType: "asc" }, { createdAt: "asc" }] }
    }
  });

  if (!property) notFound();

  const currentUser = await getCurrentUser();
  const favorite = currentUser
    ? await prisma.favorite.findUnique({ where: { userId_propertyId: { userId: currentUser.id, propertyId: property.id } } })
    : null;

  return (
    <main className="detail-page">
      <div className="container">
        <div className="breadcrumbs">
          <Link href="/">← Все объекты</Link>
          <span>{property.city}</span>
          <span>Az. {property.aktenzeichen}</span>
        </div>

        <section className="detail-hero panel">
          <div className="detail-topbar">
            <div className="detail-title-wrap">
              <p className="eyebrow">{translateGroup(property.propertyTypeGroup)} · {property.propertyType}</p>
              <h1>{property.title}</h1>
              <p className="detail-address">{shortAddress(property.address)}</p>
              <div className="detail-actions">
                <span className={`status-badge ${statusClass(property.status)}`}>{translateStatus(property.status)}</span>
                <span className="status-badge">{property.state}</span>
                <span className="status-badge">{property.court}</span>
              </div>
            </div>
            <div className="detail-price-card">
              <span>Verkehrswert</span>
              <strong>{formatEuro(property.marketValue)}</strong>
              <span>{formatDateTime(property.auctionDate, property.auctionTime)}</span>
            </div>
          </div>

          <div className="detail-actions">
            <FavoriteButton propertyId={property.id} initialIsFavorite={Boolean(favorite)} />
          </div>
          <PropertyDetailActions title={property.title} />
        </section>

        <nav className="quick-nav" aria-label="Разделы страницы">
          <a href="#gallery">Фото</a>
          <a href="#description">Описание</a>
          <a href="#auction">Торги</a>
          <a href="#features">Характеристики</a>
          <a href="#map">Карта</a>
          <a href="#documents">Документы</a>
        </nav>

        <div className="detail-summary-grid">
          <div className="summary-tile"><span>Дата торгов</span><b>{formatDateTime(property.auctionDate, property.auctionTime)}</b></div>
          <div className="summary-tile"><span>Жилая площадь</span><b>{formatArea(property.livingArea)}</b></div>
          <div className="summary-tile"><span>Участок</span><b>{formatArea(property.plotArea)}</b></div>
          <div className="summary-tile"><span>Статус использования</span><b>{translateOccupancy(property.occupancyStatus)}</b></div>
        </div>

        <div className="detail-grid">
          <section className="panel">
            <PropertyGallery
              title={property.title}
              images={property.images.map((image) => ({ id: image.id, url: image.url, alt: image.alt }))}
            />

            <div className="info-section" id="description">
              <h2>Описание объекта</h2>
              <p className="description">{property.description}</p>
            </div>

            {property.locationDescription ? (
              <div className="info-section">
                <h2>Локация</h2>
                <p className="description">{property.locationDescription}</p>
              </div>
            ) : null}

            {property.cancellationText ? (
              <div className="warning-box">
                <b>Termin aufgehoben — торги отменены</b>
                <p>{property.cancellationText}</p>
              </div>
            ) : null}

            <div className="info-section" id="documents">
              <h2>Документы</h2>
              {property.documents.length === 0 ? (
                <p className="meta">Документов пока нет.</p>
              ) : (
                <table className="document-table">
                  <thead>
                    <tr>
                      <th>Тип</th>
                      <th>Файл</th>
                      <th>Действие</th>
                    </tr>
                  </thead>
                  <tbody>
                    {property.documents.map((document) => (
                      <tr key={document.id}>
                        <td>{formatDocumentType(document.documentType)}</td>
                        <td>{document.filename}</td>
                        <td><a className="document-link" href={document.url} target="_blank" rel="noreferrer">Открыть</a></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </section>

          <aside className="detail-sidebar">
            <section className="panel" id="auction">
              <h2>Торги</h2>
              <div className="specs">
                <div className="spec"><span>Дата и время</span><b>{formatDateTime(property.auctionDate, property.auctionTime)}</b></div>
                <div className="spec"><span>Место торгов</span><b>{property.auctionLocation ?? "—"}</b></div>
                <div className="spec"><span>Суд</span><b>{property.court}</b></div>
                <div className="spec"><span>Aktenzeichen</span><b>{property.aktenzeichen}</b></div>
                <div className="spec"><span>Термин №</span><b>{property.auctionAttempt}</b></div>
                <div className="spec"><span>Wertgrenzen</span><b>{property.wertgrenzenWeggefallen ? "Сняты" : "Не сняты / неизвестно"}</b></div>
              </div>
            </section>

            <section className="panel" id="features">
              <h2>Характеристики</h2>
              <div className="specs">
                <div className="spec"><span>Адрес</span><b>{property.address}</b></div>
                <div className="spec"><span>Bundesland</span><b>{property.state}</b></div>
                <div className="spec"><span>PLZ / Ort</span><b>{property.postalCode} {property.city}</b></div>
                <div className="spec"><span>Wohnfläche</span><b>{formatArea(property.livingArea)}</b></div>
                <div className="spec"><span>Nutzfläche</span><b>{formatArea(property.usableArea)}</b></div>
                <div className="spec"><span>Gesamtfläche</span><b>{formatArea(property.totalArea)}</b></div>
                <div className="spec"><span>Grundstück</span><b>{formatArea(property.plotArea)}</b></div>
                <div className="spec"><span>Год постройки</span><b>{property.yearBuilt ?? "—"}</b></div>
                <div className="spec"><span>Использование</span><b>{translateOccupancy(property.occupancyStatus)}</b></div>
                <div className="spec"><span>Denkmalschutz</span><b>{yesNo(property.hasDenkmalschutz)}</b></div>
              </div>
            </section>

            <section className="panel" id="map">
              <h2>Карта объекта</h2>
              <PropertyDetailMap
                property={{
                  id: property.id,
                  title: property.title,
                  address: property.address,
                  latitude: property.latitude,
                  longitude: property.longitude,
                  status: property.status,
                  propertyTypeGroup: property.propertyTypeGroup,
                  city: property.city,
                  marketValue: property.marketValue
                }}
              />
              <p className="meta">Координаты: {property.latitude?.toFixed(4) ?? "—"}, {property.longitude?.toFixed(4) ?? "—"}</p>
            </section>

            <section className="panel source-box">
              <h2>Источник</h2>
              <div className="specs">
                <div className="spec"><span>Источник</span><b>{property.source}</b></div>
                <div className="spec"><span>Последнее обновление</span><b>{property.lastSourceUpdate ? property.lastSourceUpdate.toLocaleDateString("ru-RU") : "—"}</b></div>
                <div className="spec"><span>Ссылка</span><b>{property.sourceUrl ? <a href={property.sourceUrl} target="_blank" rel="noreferrer">Открыть источник</a> : "—"}</b></div>
              </div>
            </section>
          </aside>
        </div>
      </div>
    </main>
  );
}
