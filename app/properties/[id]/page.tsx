import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { formatArea, formatDate, formatEuro, translateGroup, translateOccupancy, translateStatus } from "@/lib/format";

export const dynamic = "force-dynamic";

type PropertyPageProps = {
  params: Promise<{ id: string }>;
};

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
        <p className="meta"><Link href="/">← Назад к списку</Link></p>
        <div className="detail-grid">
          <section className="panel">
            <div style={{ display: "flex", justifyContent: "space-between", gap: 16, alignItems: "start" }}>
              <div>
                <p className="meta">{translateGroup(property.propertyTypeGroup)} · {property.propertyType}</p>
                <h1 style={{ marginTop: 0 }}>{property.title}</h1>
              </div>
              <span className={`status-badge ${property.status === "CANCELLED" ? "cancelled" : ""}`}>{translateStatus(property.status)}</span>
            </div>

            {mainImage ? <img className="detail-image" src={mainImage.url} alt={mainImage.alt ?? property.title} /> : null}
            {property.images.length > 1 ? (
              <div className="gallery">
                {property.images.slice(1).map((image) => <img key={image.id} src={image.url} alt={image.alt ?? property.title} />)}
              </div>
            ) : null}

            <h2>Описание</h2>
            <p className="description">{property.description}</p>

            {property.locationDescription ? (
              <>
                <h2>Локация</h2>
                <p className="description">{property.locationDescription}</p>
              </>
            ) : null}

            {property.cancellationText ? (
              <div className="empty" style={{ borderColor: "#fecaca", color: "#991b1b" }}>
                <b>Информация об отмене:</b><br />{property.cancellationText}
              </div>
            ) : null}
          </section>

          <aside className="panel">
            <h2 style={{ marginTop: 0 }}>Характеристики</h2>
            <div className="specs">
              <div className="spec"><span>Адрес</span><b>{property.address}</b></div>
              <div className="spec"><span>Aktenzeichen</span><b>{property.aktenzeichen}</b></div>
              <div className="spec"><span>Суд</span><b>{property.court}</b></div>
              <div className="spec"><span>Bundesland</span><b>{property.state}</b></div>
              <div className="spec"><span>Дата торгов</span><b>{formatDate(property.auctionDate)}</b></div>
              <div className="spec"><span>Время</span><b>{property.auctionTime ?? "—"}</b></div>
              <div className="spec"><span>Место торгов</span><b>{property.auctionLocation ?? "—"}</b></div>
              <div className="spec"><span>Verkehrswert</span><b>{formatEuro(property.marketValue)}</b></div>
              <div className="spec"><span>Wohnfläche</span><b>{formatArea(property.livingArea)}</b></div>
              <div className="spec"><span>Nutzfläche</span><b>{formatArea(property.usableArea)}</b></div>
              <div className="spec"><span>Gesamtfläche</span><b>{formatArea(property.totalArea)}</b></div>
              <div className="spec"><span>Grundstück</span><b>{formatArea(property.plotArea)}</b></div>
              <div className="spec"><span>Год постройки</span><b>{property.yearBuilt ?? "—"}</b></div>
              <div className="spec"><span>Использование</span><b>{translateOccupancy(property.occupancyStatus)}</b></div>
              <div className="spec"><span>Denkmalschutz</span><b>{property.hasDenkmalschutz ? "Да" : "Нет"}</b></div>
              <div className="spec"><span>Wertgrenzen</span><b>{property.wertgrenzenWeggefallen ? "Сняты" : "Не сняты / неизвестно"}</b></div>
              <div className="spec"><span>Термин</span><b>{property.auctionAttempt}</b></div>
            </div>

            <h2>Документы</h2>
            {property.documents.length === 0 ? (
              <p className="meta">Документов пока нет.</p>
            ) : (
              <div className="specs">
                {property.documents.map((document) => (
                  <a className="spec" key={document.id} href={document.url} target="_blank" rel="noreferrer">
                    <span>{document.documentType}</span><b>{document.filename}</b>
                  </a>
                ))}
              </div>
            )}
          </aside>
        </div>
      </div>
    </main>
  );
}
