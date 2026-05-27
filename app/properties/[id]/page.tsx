import Link from "next/link";
import { notFound } from "next/navigation";
import { PropertyDetailMap } from "@/components/PropertyDetailMap";
import { prisma } from "@/lib/prisma";
import { formatArea, formatDateTime, formatEuro, shortAddress, statusClass, translateGroup, translateOccupancy, translateStatus } from "@/lib/format";

export const dynamic = "force-dynamic";

type PropertyPageProps = {
  params: Promise<{ id: string }>;
};

function yesNo(value: boolean): string {
  return value ? "Да" : "Нет";
}

export default async function PropertyPage({ params }: PropertyPageProps) {
  const { id } = await params;
  const property = await prisma.property.findUnique({
    where: { id },
    include: {
      images: { orderBy: [{ isMain: "desc" }, { sortOrder: "asc" }] },
      documents: { orderBy: { createdAt: "asc" } }
    }
  });

  if (!property) notFound();

  const mainImage = property.images[0];

  return (
    <main className="detail-page">
      <div className="container">
        <div className="breadcrumbs"><Link href="/">← Все объекты</Link><span>{property.city}</span><span>Az. {property.aktenzeichen}</span></div>

        <section className="detail-hero panel">
          <div>
            <p className="eyebrow">{translateGroup(property.propertyTypeGroup)} · {property.propertyType}</p>
            <h1>{property.title}</h1>
            <p className="detail-address">{shortAddress(property.address)}</p>
          </div>
          <div className="detail-hero-side">
            <span className={`status-badge ${statusClass(property.status)}`}>{translateStatus(property.status)}</span>
            <b>{formatEuro(property.marketValue)}</b>
            <span>Verkehrswert</span>
          </div>
        </section>

        <div className="detail-grid">
          <section className="panel">
            {mainImage ? (
              <img className="detail-image" src={mainImage.url} alt={mainImage.alt ?? property.title} />
            ) : (
              <div className="detail-image-placeholder">Нет главного фото</div>
            )}

            {property.images.length > 1 ? (
              <div className="gallery">
                {property.images.slice(1).map((image) => <img key={image.id} src={image.url} alt={image.alt ?? property.title} />)}
              </div>
            ) : null}

            <div className="content-block">
              <h2>Описание объекта</h2>
              <p className="description">{property.description}</p>
            </div>

            {property.locationDescription ? (
              <div className="content-block">
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
          </section>

          <aside className="detail-sidebar">
            <section className="panel">
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

            <section className="panel">
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

            <section className="panel">
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

            <section className="panel">
              <h2>Документы</h2>
              {property.documents.length === 0 ? (
                <p className="meta">Документов пока нет.</p>
              ) : (
                <div className="document-list">
                  {property.documents.map((document) => (
                    <a className="document-item" key={document.id} href={document.url} target="_blank" rel="noreferrer">
                      <span>{document.documentType}</span>
                      <b>{document.filename}</b>
                    </a>
                  ))}
                </div>
              )}
            </section>
          </aside>
        </div>
      </div>
    </main>
  );
}
