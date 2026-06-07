import { MainCardGallery } from "@/components/MainCardGallery";
import Link from "next/link";
import { FavoriteButton } from "@/components/FavoriteButton";
import {
  formatArea,
  formatDateTime,
  formatEuro,
  shortAddress,
  statusClass,
} from "@/lib/format";
import type { Locale } from "@/lib/i18n/config";
import { defaultLocale } from "@/lib/i18n/config";
import {
  pickPropertyTranslation,
  type PropertyTranslationLike,
} from "@/lib/i18n/property-translations";
import {
  getPublicUi,
  labelGroup,
  labelOccupancy,
  labelStatus,
} from "@/lib/i18n/property-labels";

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

const cardLabels = {
  de: {
    heritage: "Denkmalschutz",
    valueLimitsGone: "Wertgrenzen weggefallen",
  },
  ru: {
    heritage: "Памятник архитектуры",
    valueLimitsGone: "Ценовые границы сняты",
  },
  en: {
    heritage: "Listed monument",
    valueLimitsGone: "Value limits removed",
  },
} as const;

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
  const ui = getPublicUi(locale);
  const cardUi = cardLabels[locale];

  return (
    <article className="property-card">
      <Link
        className="card-image-wrap"
        href={`/properties/${property.id}`}
        aria-label={`${ui.details}: ${translated.title}`}
      >
        {mainImage ? (
          <MainCardGallery
              images={(property as any).images || (property as any).photos}
              fallbackSrc={(property as any).imageUrl || (property as any).mainImage || (property as any).coverImage || (property as any).photoUrl || (property as any).images?.[0]?.url || (property as any).images?.[0]?.src || (property as any).images?.[0]?.imageUrl}
              alt={(property as any).title || (property as any).headline || (property as any).address || ""}
            />
        ) : (
          <div className="image-placeholder">{ui.noPhoto}</div>
        )}
        <span className={`status-badge image-badge ${statusClass(property.status)}`}>
          {labelStatus(property.status, locale)}
        </span>
      </Link>

      <div className="card-content">
        <div className="card-main-row">
          <div>
            <p className="eyebrow">
              {labelGroup(property.propertyTypeGroup, locale)}
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
          <span>{labelOccupancy(property.occupancyStatus, locale)}</span>
          {property.hasDenkmalschutz ? <span>{cardUi.heritage}</span> : null}
          {property.wertgrenzenWeggefallen ? <span>{cardUi.valueLimitsGone}</span> : null}
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
