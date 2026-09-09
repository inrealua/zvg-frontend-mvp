import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { FavoriteButton } from "@/components/FavoriteButton";
import { PropertyDetailActions } from "@/components/PropertyDetailActions";
import { PropertyDetailMap } from "@/components/PropertyDetailMap";
import { PropertyGallery } from "@/components/PropertyGallery";
import { PropertyInvestmentAnalysis } from "@/components/PropertyInvestmentAnalysis";
import { prisma } from "@/lib/prisma";
import { formatArea, formatDateTime, formatEuro, shortAddress, statusClass } from "@/lib/format";
import { labelGroup, labelOccupancy, labelStatus } from "@/lib/i18n/property-labels";
import { getCurrentUser } from "@/lib/user-auth";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { getI18n } from "@/lib/i18n/server";
import { getPropertyUi, pickPropertyTranslation, translationInclude } from "@/lib/i18n/property-translations";

export const dynamic = "force-dynamic";
type PropertyPageProps = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: PropertyPageProps): Promise<Metadata> {
  const { id } = await params;
  const property = await prisma.property.findUnique({ where: { id }, include: { translations: true, images: { where: { isMain: true }, select: { url: true }, take: 1 } } });
  if (!property) return { title: "Objekt nicht gefunden", robots: { index: false, follow: false } };
  const translated = pickPropertyTranslation(property, "de");
  const priceText = property.officialVerkehrswertEur ? ` · Verkehrswert ${property.officialVerkehrswertEur.toLocaleString("de-DE")} €` : "";
  const title = `${translated.propertyType || property.propertyType} in ${property.city}`;
  const description = `${translated.title} · ${property.address}${priceText}`;
  const imageUrl = property.images[0]?.url;
  return { title, description, robots: property.publicationStatus === "PUBLISHED" ? undefined : { index: false, follow: false }, openGraph: { title, description, type: "article", images: imageUrl ? [{ url: imageUrl }] : undefined }, twitter: { card: imageUrl ? "summary_large_image" : "summary", title, description, images: imageUrl ? [imageUrl] : undefined } };
}

function formatDocumentType(type: string, locale: string): string {
  const labels: Record<string, Record<string, string>> = {
    GUTACHTEN:{de:"Gutachten",ru:"Отчёт об оценке",en:"Valuation report"},
    BEKANNTMACHUNG:{de:"Bekanntmachung",ru:"Официальное объявление",en:"Official notice"},
    EXPOSE:{de:"Exposé",ru:"Экспозе",en:"Exposé"}, FOTO:{de:"Foto",ru:"Фото",en:"Photo"}, OTHER:{de:"Sonstiges Dokument",ru:"Другой документ",en:"Other document"},
  };
  return labels[type]?.[locale] ?? type;
}
function docTitle(document:any, locale:string){ return (locale==="ru"?document.titleRu:locale==="en"?document.titleEn:document.titleDe)||formatDocumentType(document.documentType,locale); }
const localLabels = {
  de:{photos:"Fotos",preview:"Vorschau: Objekt ist noch nicht veröffentlicht",postalCity:"PLZ / Ort",usable:"Nutzfläche",total:"Gesamtfläche",lastUpdate:"Letzte Aktualisierung",link:"Link",sourcePortal:"Portal",long:"Ausführliche Beschreibung"},
  ru:{photos:"Фото",preview:"Предпросмотр: объект ещё не опубликован",postalCity:"Индекс / населённый пункт",usable:"Полезная площадь",total:"Общая площадь",lastUpdate:"Последнее обновление",link:"Ссылка",sourcePortal:"Портал",long:"Подробное описание"},
  en:{photos:"Photos",preview:"Preview: this property is not published yet",postalCity:"Postcode / locality",usable:"Usable area",total:"Total area",lastUpdate:"Last update",link:"Link",sourcePortal:"Portal",long:"Detailed description"},
} as const;

export default async function PropertyPage({ params }: PropertyPageProps) {
  const { id } = await params;
  const { locale, t } = await getI18n();
  const ui = getPropertyUi(locale); const ll=localLabels[locale];
  const property = await prisma.property.findUnique({ where: { id }, include: { ...translationInclude(locale), images: { orderBy: [{ isMain: "desc" }, { sortOrder: "asc" }, { createdAt: "asc" }] }, documents: { orderBy: [{ documentType: "asc" }, { createdAt: "asc" }] } } });
  if (!property) notFound();
  const admin = await isAdminAuthenticated();
  if (property.publicationStatus !== "PUBLISHED" && !admin) notFound();
  const translated = pickPropertyTranslation(property, locale);
  const localized = translated.localizedFields as Record<string, unknown>;
  const localizedText = (key:string, fallback?:string|null) => typeof localized?.[key] === "string" && String(localized[key]).trim() ? String(localized[key]) : (fallback || ui.unknown);
  const currentUser = await getCurrentUser();
  const favorite = currentUser && property.publicationStatus === "PUBLISHED" ? await prisma.favorite.findUnique({ where: { userId_propertyId: { userId: currentUser.id, propertyId: property.id } } }) : null;

  const richSections = [
    [ui.building, translated.buildingAndLayout], [ui.condition, translated.conditionAndRenovation], [ui.occupancy, translated.useAndOccupancy], [ui.plotAccess, translated.plotAndAccess], [ui.surroundings, translated.locationAndSurroundings], [ui.special, translated.specialFeatures], [ui.legalNotes, translated.auctionAndLegalNotes],
  ].filter((x): x is [string,string] => Boolean(x[1]));

  return <main className="detail-page"><div className="container">
    {property.publicationStatus !== "PUBLISHED" ? <div className="analysis-review-banner">{ll.preview} · {property.publicationStatus}</div> : null}
    <div className="breadcrumbs"><Link href="/">{t.nav.home}</Link><span>{property.city}</span><span>Az. {property.aktenzeichen}</span></div>

    <section className="detail-hero panel"><div className="detail-topbar"><div className="detail-title-wrap"><p className="eyebrow">{labelGroup(property.propertyTypeGroup, locale)} · {translated.propertyType || property.propertyType}</p><h1>{translated.title}</h1>{translated.shortDescription?<p className="detail-subtitle">{translated.shortDescription}</p>:null}<p className="detail-address">{shortAddress(property.address)}</p><div className="detail-actions"><span className={`status-badge ${statusClass(property.status)}`}>{labelStatus(property.status, locale)}</span><span className="status-badge">{property.state}</span><span className="status-badge">{property.court}</span></div></div><div className="detail-price-card"><span>{ui.marketValue}</span><strong>{formatEuro(property.officialVerkehrswertEur ?? property.marketValue)}</strong><span>{formatDateTime(property.auctionDate, property.auctionTime)}</span></div></div>
      {property.publicationStatus === "PUBLISHED" ? <div className="detail-actions"><FavoriteButton propertyId={property.id} initialIsFavorite={Boolean(favorite)} /></div> : null}<PropertyDetailActions title={translated.title}/>
    </section>

    <nav className="quick-nav" aria-label="Detail navigation"><a href="#gallery">{ll.photos}</a><a href="#description">{ui.description}</a>{property.analysisVersion?<a href="#analysis">{ui.analysis}</a>:null}<a href="#auction">{ui.auction}</a><a href="#features">{ui.features}</a><a href="#map">{ui.map}</a><a href="#documents">{ui.documents}</a></nav>
    <div className="detail-summary-grid"><div className="summary-tile"><span>{ui.auctionDate}</span><b>{formatDateTime(property.auctionDate,property.auctionTime)}</b></div><div className="summary-tile"><span>{ui.livingArea}</span><b>{formatArea(property.livingArea)}</b></div><div className="summary-tile"><span>{ui.plotArea}</span><b>{formatArea(property.plotArea)}</b></div><div className="summary-tile"><span>{ui.use}</span><b>{localizedText("occupancy", labelOccupancy(property.occupancyStatus, locale))}</b></div></div>

    <div className="detail-grid"><section className="panel">
      <PropertyGallery title={translated.title} images={property.images.map(image=>({id:image.id,url:image.url,alt:image.alt}))}/>
      <div className="info-section" id="description"><h2>{ui.description}</h2><p className="description">{translated.description}</p>{translated.longDescription && translated.longDescription!==translated.description?<><h3>{ll.long}</h3><p className="description">{translated.longDescription}</p></>:null}</div>
      {richSections.map(([title,body])=><div className="info-section rich-object-section" key={title}><h2>{title}</h2><p className="description">{body}</p></div>)}
      {property.cancellationText?<div className="warning-box"><b>{ui.cancelled}</b><p>{property.cancellationText}</p></div>:null}
      <PropertyInvestmentAnalysis locale={locale} translated={translated} property={property}/>

      <div className="info-section" id="documents"><h2>{ui.documents}</h2>{property.documents.length===0?<p className="meta">{ui.noDocuments}</p>:<table className="document-table"><thead><tr><th>{ui.type}</th><th>{ui.file}</th><th>{ui.action}</th></tr></thead><tbody>{property.documents.map(document=><tr key={document.id}><td>{docTitle(document,locale)}</td><td>{document.originalFilename||document.filename}{document.sourcePortal?<small className="document-source">{document.sourcePortal}</small>:null}</td><td><a className="document-link" href={document.url} target="_blank" rel="noreferrer">{ui.open}</a></td></tr>)}</tbody></table>}</div>
    </section>

    <aside className="detail-sidebar">
      <section className="panel" id="auction"><h2>{ui.auction}</h2><div className="specs"><div className="spec"><span>{ui.auctionDate}</span><b>{formatDateTime(property.auctionDate,property.auctionTime)}</b></div><div className="spec"><span>{ui.auctionLocation}</span><b>{property.auctionLocation??ui.unknown}</b></div><div className="spec"><span>{ui.court}</span><b>{property.court}</b></div><div className="spec"><span>Aktenzeichen</span><b>{property.aktenzeichen}</b></div><div className="spec"><span>{ui.attempt}</span><b>{property.auctionAttempt}</b></div><div className="spec"><span>{ui.valueLimits}</span><b>{property.wertgrenzenWeggefallen?ui.valueLimitsGone:ui.valueLimitsNotGone}</b></div></div></section>
      <section className="panel" id="features"><h2>{ui.features}</h2><div className="specs"><div className="spec"><span>{ui.address}</span><b>{property.address}</b></div><div className="spec"><span>{ui.federalState}</span><b>{property.state}</b></div><div className="spec"><span>{ll.postalCity}</span><b>{property.postalCode} {property.city}</b></div><div className="spec"><span>{ui.livingArea}</span><b>{formatArea(property.livingArea)}</b></div><div className="spec"><span>{ll.usable}</span><b>{formatArea(property.usableArea)}</b></div><div className="spec"><span>{ll.total}</span><b>{formatArea(property.totalArea)}</b></div><div className="spec"><span>{ui.plotArea}</span><b>{formatArea(property.plotArea)}</b></div><div className="spec"><span>{ui.constructionYear}</span><b>{property.yearBuilt??ui.unknown}</b></div><div className="spec"><span>{ui.type}</span><b>{localizedText("propertyType",translated.propertyType)}</b></div><div className="spec"><span>{ui.use}</span><b>{localizedText("use",localizedText("occupancy",labelOccupancy(property.occupancyStatus, locale)))}</b></div>{localized.heating?<div className="spec"><span>{locale==="de"?"Heizung":locale==="ru"?"Отопление":"Heating"}</span><b>{localizedText("heating")}</b></div>:null}<div className="spec"><span>{ui.heritage}</span><b>{property.hasDenkmalschutz?ui.yes:ui.no}</b></div></div></section>
      <section className="panel" id="map"><h2>{ui.map}</h2><PropertyDetailMap property={{id:property.id,title:translated.title,address:property.address,latitude:property.latitude,longitude:property.longitude,status:property.status,propertyTypeGroup:property.propertyTypeGroup,city:property.city,marketValue:property.officialVerkehrswertEur??property.marketValue}}/><p className="meta">{ui.coordinates}: {property.latitude?.toFixed(4)??ui.unknown}, {property.longitude?.toFixed(4)??ui.unknown}</p></section>
      <section className="panel source-box"><h2>{ui.sourceInfo}</h2><div className="specs"><div className="spec"><span>{ll.sourcePortal}</span><b>{property.primarySourcePortal||property.source}</b></div><div className="spec"><span>{ll.lastUpdate}</span><b>{property.lastSourceUpdate?property.lastSourceUpdate.toLocaleDateString(locale==="ru"?"ru-RU":locale==="en"?"en-US":"de-DE"):ui.unknown}</b></div><div className="spec"><span>{ll.link}</span><b>{property.primarySourceUrl||property.sourceUrl?<a href={property.primarySourceUrl||property.sourceUrl||"#"} target="_blank" rel="noreferrer">{ui.open}</a>:ui.unknown}</b></div></div></section>
    </aside></div>
  </div></main>;
}
