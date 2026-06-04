import Link from "next/link";
import { FavoriteButton } from "@/components/FavoriteButton";
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
import type { Locale } from "@/lib/i18n/config";
import { defaultLocale } from "@/lib/i18n/config";
import {
  getPropertyUi,
  pickPropertyTranslation,
  type PropertyTranslationLike,
} from "@/lib/i18n/property-translations";

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
  translations?: PropertyTranslationLike[];
};

export function PropertyCard({
  property,
  isFavorite = false,
  locale = defaultLocale,
}: {
  property: PropertyCardData;
  isFavorite?: boolean;
  locale?: Locale;
}) {
  const mainImage = property.images[0];
  const translated = pickPropertyTranslation(property, locale);
  const ui = getPropertyUi(locale);

  return (
    <article className="property-card">
      <Link
        className="card-image-wrap"
        href={`/properties/${property.id}`}
        aria-label={`${ui.openObject}: ${translated.title}`}
      >
        {mainImage ? (
          <img src={mainImage.url} alt={mainImage.alt ?? translated.title} />
        ) : (
          <div className="image-placeholder">{ui.noPhoto}</div>
        )}
        <span className={`status-badge image-badge ${statusClass(property.status)}`}>
          {translateStatus(property.status)}
        </span>
      </Link>

      <div className="card-content">
        <div className="card-main-row">
          <div>
            <p className="eyebrow">
              {translateGroup(property.propertyTypeGroup)} · {translated.propertyType || property.propertyType}
            </p>
            <h2 className="card-title">
              <Link href={`/properties/${property.id}`}>{translated.title}</Link>
            </h2>
          </div>
          <div className="price-box">
            <span>{ui.marketValue}</span>
            <b>{formatEuro(property.marketValue)}</b>
          </div>
        </div>

        <div className="address-line">
          <b>{shortAddress(property.address)}</b>
          <span>{property.court} · Az. {property.aktenzeichen}</span>
        </div>

        <div className="kpis">
          <div className="kpi"><b>{formatDateTime(property.auctionDate, property.auctionTime)}</b><br />{ui.auctionDate}</div>
          <div className="kpi"><b>{formatArea(property.livingArea)}</b><br />{ui.livingArea}</div>
          <div className="kpi"><b>{formatArea(property.plotArea)}</b><br />{ui.plotArea}</div>
          <div className="kpi"><b>{property.auctionAttempt}</b><br />{ui.attempt}</div>
        </div>

        <div className="tag-row">
          <span>{property.state}</span>
          <span>{property.postalCode} {property.city}</span>
          <span>{translateOccupancy(property.occupancyStatus)}</span>
          {property.hasDenkmalschutz ? <span>Denkmalschutz</span> : null}
          {property.wertgrenzenWeggefallen ? <span>Wertgrenzen weggefallen</span> : null}
        </div>

        <div className="card-footer">
          <span className="meta">{ui.source}: Testdaten / DB</span>
          <div className="card-actions">
            <FavoriteButton propertyId={property.id} initialIsFavorite={isFavorite} compact />
            <Link className="btn btn-soft" href={`/properties/${property.id}`}>{ui.details}</Link>
          </div>
        </div>
      </div>
    </article>
  );
}
