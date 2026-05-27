import Link from "next/link";
import { PropertyStatus } from "@prisma/client";
import { formatArea, formatDate, formatEuro, translateGroup, translateOccupancy, translateStatus } from "@/lib/format";

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
  address: string;
  propertyType: string;
  propertyTypeGroup: string;
  status: PropertyStatus;
  occupancyStatus: string;
  auctionDate: Date | null;
  auctionTime: string | null;
  marketValue: number | null;
  livingArea: number | null;
  plotArea: number | null;
  wertgrenzenWeggefallen: boolean;
  hasDenkmalschutz: boolean;
  images: PropertyCardImage[];
};

export function PropertyCard({ property }: { property: PropertyCardData }) {
  const mainImage = property.images[0];
  const cancelled = property.status === "CANCELLED";

  return (
    <article className="property-card">
      <Link className="card-image-wrap" href={`/properties/${property.id}`}>
        {mainImage ? <img src={mainImage.url} alt={mainImage.alt ?? property.title} /> : null}
      </Link>
      <div className="card-content">
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "start" }}>
          <div>
            <p className="meta">{translateGroup(property.propertyTypeGroup)} · {property.propertyType}</p>
            <h2 className="card-title"><Link href={`/properties/${property.id}`}>{property.title}</Link></h2>
          </div>
          <span className={`status-badge ${cancelled ? "cancelled" : ""}`}>{translateStatus(property.status)}</span>
        </div>

        <div className="meta">
          {property.address}<br />
          {property.court} · Az. {property.aktenzeichen}
        </div>

        <div className="kpis">
          <div className="kpi"><b>{formatEuro(property.marketValue)}</b><br />Verkehrswert</div>
          <div className="kpi"><b>{formatDate(property.auctionDate)}</b><br />{property.auctionTime ?? "—"}</div>
          <div className="kpi"><b>{formatArea(property.livingArea)}</b><br />Wohnfläche</div>
          <div className="kpi"><b>{formatArea(property.plotArea)}</b><br />Grundstück</div>
        </div>

        <div className="card-footer">
          <div className="meta">
            {translateOccupancy(property.occupancyStatus)}
            {property.hasDenkmalschutz ? " · Denkmalschutz" : ""}
            {property.wertgrenzenWeggefallen ? " · Wertgrenzen weggefallen" : ""}
          </div>
          <Link className="btn btn-soft" href={`/properties/${property.id}`}>Подробнее</Link>
        </div>
      </div>
    </article>
  );
}
