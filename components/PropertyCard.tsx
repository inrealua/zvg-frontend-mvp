import Link from "next/link";
import { formatArea, formatDateTime, formatEuro, shortAddress, statusClass, translateGroup, translateOccupancy, translateStatus } from "@/lib/format";

type PropertyCardImage = {
  url: string;
  alt: string | null;
};

export type PropertyCardData = {
  id: string;
  title: string;
  aktenzeichen: string;
  court: string;
  state: string;
  city: string;
  postalCode: string;
  address: string;
  propertyType: string;
  propertyTypeGroup: string;
  status: string;
  occupancyStatus: string;
  auctionDate: Date | null;
  auctionTime: string | null;
  marketValue: number | null;
  livingArea: number | null;
  plotArea: number | null;
  auctionAttempt: number;
  wertgrenzenWeggefallen: boolean;
  hasDenkmalschutz: boolean;
  images: PropertyCardImage[];
};

export function PropertyCard({ property }: { property: PropertyCardData }) {
  const mainImage = property.images[0];

  return (
    <article className="property-card">
      <Link className="card-image-wrap" href={`/properties/${property.id}`} aria-label={`Открыть ${property.title}`}>
        {mainImage ? (
          <img src={mainImage.url} alt={mainImage.alt ?? property.title} />
        ) : (
          <div className="image-placeholder">Нет фото</div>
        )}
        <span className={`status-badge image-badge ${statusClass(property.status)}`}>{translateStatus(property.status)}</span>
      </Link>

      <div className="card-content">
        <div className="card-main-row">
          <div>
            <p className="eyebrow">{translateGroup(property.propertyTypeGroup)} · {property.propertyType}</p>
            <h2 className="card-title"><Link href={`/properties/${property.id}`}>{property.title}</Link></h2>
          </div>
          <div className="price-box">
            <span>Verkehrswert</span>
            <b>{formatEuro(property.marketValue)}</b>
          </div>
        </div>

        <div className="address-line">
          <b>{shortAddress(property.address)}</b>
          <span>{property.court} · Az. {property.aktenzeichen}</span>
        </div>

        <div className="kpis">
          <div className="kpi"><b>{formatDateTime(property.auctionDate, property.auctionTime)}</b><br />Termin</div>
          <div className="kpi"><b>{formatArea(property.livingArea)}</b><br />Wohnfläche</div>
          <div className="kpi"><b>{formatArea(property.plotArea)}</b><br />Grundstück</div>
          <div className="kpi"><b>{property.auctionAttempt}</b><br />Termin-Nr.</div>
        </div>

        <div className="tag-row">
          <span>{property.state}</span>
          <span>{property.postalCode} {property.city}</span>
          <span>{translateOccupancy(property.occupancyStatus)}</span>
          {property.hasDenkmalschutz ? <span>Denkmalschutz</span> : null}
          {property.wertgrenzenWeggefallen ? <span>Wertgrenzen weggefallen</span> : null}
        </div>

        <div className="card-footer">
          <span className="meta">Quelle: Testdaten / DB</span>
          <Link className="btn btn-soft" href={`/properties/${property.id}`}>Details ansehen</Link>
        </div>
      </div>
    </article>
  );
}
