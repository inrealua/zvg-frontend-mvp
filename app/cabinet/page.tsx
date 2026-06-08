import Link from "next/link";
import { redirect } from "next/navigation";
import { AuctionCalendar } from "@/components/AuctionCalendar";
import { DeleteFavoriteButton } from "@/components/DeleteFavoriteButton";
import { DeleteSavedSearchButton } from "@/components/DeleteSavedSearchButton";
import { FavoriteNoteForm } from "@/components/FavoriteNoteForm";
import { SavedSearchNameForm } from "@/components/SavedSearchNameForm";
import { prisma } from "@/lib/prisma";
import { formatDateTime, formatEuro, shortAddress, translateStatus } from "@/lib/format";
import { getCurrentUser } from "@/lib/user-auth";
import { getI18n } from "@/lib/i18n/server";
import {
  getPropertyUi,
  pickPropertyTranslation,
  translationInclude,
} from "@/lib/i18n/property-translations";

export const dynamic = "force-dynamic";

function localizeSavedSearchUrl(filtersUrl: string, locale: "de" | "ru" | "en") {
  if (!filtersUrl || !filtersUrl.startsWith("/")) return `/${locale}`;
  if (/^\/(de|ru|en)(\/|\?|$)/.test(filtersUrl)) return filtersUrl;
  if (filtersUrl === "/") return `/${locale}`;
  if (filtersUrl.startsWith("/?")) return `/${locale}${filtersUrl.slice(1)}`;
  if (filtersUrl.startsWith("/archive") || filtersUrl.startsWith("/map") || filtersUrl.startsWith("/properties")) return filtersUrl;
  return `/${locale}${filtersUrl}`;
}

export default async function CabinetPage() {
const user = await getCurrentUser();
  if (!user) redirect("/login?next=/cabinet");

  const { locale, t } = await getI18n();
  const ui = getPropertyUi(locale);

  const [favorites, savedSearches, favoriteCount, savedSearchCount] = await Promise.all([
    prisma.favorite.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      include: {
        property: {
          include: {
            ...translationInclude(locale),
            images: {
              orderBy: [{ isMain: "desc" }, { sortOrder: "asc" }],
              take: 1,
            },
          },
        },
      },
    }),
    prisma.savedSearch.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
    }),
    prisma.favorite.count({ where: { userId: user.id } }),
    prisma.savedSearch.count({ where: { userId: user.id } }),
  ]);

  const sortedFavorites = [...favorites].sort((a, b) => {
    const dateA = a.property.auctionDate?.getTime() ?? Number.MAX_SAFE_INTEGER;
    const dateB = b.property.auctionDate?.getTime() ?? Number.MAX_SAFE_INTEGER;
    return dateA - dateB;
  });

  const calendarEvents = sortedFavorites
    .filter((favorite) => favorite.property.auctionDate)
    .map((favorite) => {
      const property = favorite.property;
      const translated = pickPropertyTranslation(property, locale);
      const image = property.images[0];

      return {
        id: property.id,
        title: translated.title,
        city: property.city,
        address: property.address,
        auctionDate: property.auctionDate?.toISOString() ?? "",
        auctionTime: property.auctionTime,
        marketValue: property.marketValue,
        imageUrl: image?.url ?? null,
        status: property.status,
      };
    });

  return (
    <main className="cabinet-page cabinet-page-v39">
      <div className="container page-section">
        <section className="panel cabinet-hero cabinet-hero-v39">
          <div>
            <p className="eyebrow">{t.nav.account}</p>
            <h1>{user.name || user.email}</h1>
            <p className="meta">
              {locale === "ru"
                ? "Избранное, личные заметки, сохранённые поиски и календарь торгов."
                : locale === "en"
                  ? "Favorites, personal notes, saved searches and auction calendar."
                  : "Favoriten, persönliche Notizen, gespeicherte Suchaufträge und Auktionstermine."}
            </p>
          </div>
          <div className="cabinet-stats">
            <a href="#favorites"><span>{favoriteCount}</span><b>{locale === "ru" ? "Избранное" : locale === "en" ? "Favorites" : "Favoriten"}</b></a>
            <a href="#searches"><span>{savedSearchCount}</span><b>{locale === "ru" ? "Поиски" : locale === "en" ? "Saved searches" : "Gespeicherte Suchen"}</b></a>
            <a href="#calendar"><span>{calendarEvents.length}</span><b>{locale === "ru" ? "Календарь" : locale === "en" ? "Calendar" : "Kalendertermine"}</b></a>
          </div>
        </section>

        <section id="favorites" className="panel cabinet-section cabinet-favorites-v39">
          <div className="section-head">
            <div>
              <h2>{locale === "ru" ? "Моё избранное" : locale === "en" ? "My Favorites" : "Meine Favoriten"}</h2>
              <p className="meta">
                {locale === "ru"
                  ? "Ваши сохранённые объекты. Личные заметки видны только вам."
                  : locale === "en"
                    ? "Your saved properties. Personal notes are visible only to you."
                    : "Ihre gespeicherten Immobilien. Persönliche Notizen sind nur für Sie sichtbar."}
              </p>
            </div>
            <Link className="btn btn-soft" href="/">{t.nav.home}</Link>
          </div>

          {sortedFavorites.length === 0 ? (
            <div className="empty-state compact">
              {locale === "ru" ? "У вас пока нет избранных объектов." : locale === "en" ? "You have no favorites yet." : "Sie haben noch keine Favoriten gespeichert."}
            </div>
          ) : (
            <div className="favorite-grid-v39">
              {sortedFavorites.map((favorite) => {
                const property = favorite.property;
                const translated = pickPropertyTranslation(property, locale);
                const image = property.images[0];

                return (
                  <article className="favorite-card-v39" key={favorite.id}>
                    <Link className="favorite-thumb-v39" href={`/properties/${property.id}`}>
                      {image ? <img src={image.url} alt={image.alt ?? translated.title} /> : <span>{ui.noPhoto}</span>}
                    </Link>

                    <div className="favorite-content-v39">
                      <div className="favorite-top-v39">
                        <p className="eyebrow">{translated.propertyType || property.propertyType} · {property.city}</p>
                        <span className="favorite-star-v39" aria-hidden="true">★</span>
                      </div>

                      <h3><Link href={`/properties/${property.id}`}>{translated.title}</Link></h3>
                      <p className="favorite-address-v39">{shortAddress(property.address)}</p>

                      <div className="favorite-tags-v39">
                        <span>{formatEuro(property.marketValue)}</span>
                        <span>{formatDateTime(property.auctionDate, property.auctionTime)}</span>
                        <span>{property.court}</span>
                      </div>

                      <FavoriteNoteForm propertyId={property.id} initialNote={favorite.note ?? ""} />

                      <div className="favorite-actions-v39">
                        <Link className="btn btn-soft favorite-details-v39" href={`/properties/${property.id}`}>
                          {ui.details}
                        </Link>
                        <DeleteFavoriteButton propertyId={property.id} />
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>

        <section id="searches" className="panel cabinet-section">
          <div className="section-head">
            <div>
              <h2>{locale === "ru" ? "Сохранённые поиски" : locale === "en" ? "Saved searches" : "Gespeicherte Suchen"}</h2>
              <p className="meta">
                {locale === "ru"
                  ? "Переименуйте поиски, чтобы позже получать уведомления по понятным названиям."
                  : locale === "en"
                    ? "Name your searches so future email notifications are easy to understand."
                    : "Benennen Sie Ihre Suchaufträge, damit spätere Benachrichtigungen verständliche Namen haben."}
              </p>
            </div>
          </div>

          {savedSearches.length === 0 ? (
            <div className="empty-state compact">
              {locale === "ru" ? "У вас пока нет сохранённых поисков." : locale === "en" ? "You have no saved searches yet." : "Sie haben noch keine Suchen gespeichert."}
            </div>
          ) : (
            <div className="saved-search-list">
              {savedSearches.map((savedSearch) => (
                <article className="saved-search-item saved-search-item-editable" key={savedSearch.id}>
                  <div>
                    <SavedSearchNameForm
                      searchId={savedSearch.id}
                      initialName={savedSearch.name || ""}
                      fallbackName={savedSearch.humanReadableSummary}
                    />
                    <p>{savedSearch.humanReadableSummary}</p>
                    <span className="meta">{savedSearch.createdAt.toLocaleDateString(locale === "ru" ? "ru-RU" : locale === "en" ? "en-US" : "de-DE")}</span>
                  </div>
                  <div className="cabinet-actions">
                    <Link className="btn btn-primary" href={localizeSavedSearchUrl(savedSearch.filtersUrl, locale)}>{locale === "ru" ? "Открыть поиск" : locale === "en" ? "Open search" : "Suche öffnen"}</Link>
                    <DeleteSavedSearchButton searchId={savedSearch.id} />
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        <section id="calendar" className="panel cabinet-section">
          <div className="section-head">
            <div>
              <h2>{locale === "ru" ? "Календарь торгов" : locale === "en" ? "Auction Calendar" : "Auktionskalender"}</h2>
              <p className="meta">
                {locale === "ru"
                  ? "Избранные объекты по датам торгов."
                  : locale === "en"
                    ? "Your favorite properties by auction date."
                    : "Ihre favorisierten Objekte nach Auktionstermin."}
              </p>
            </div>
          </div>

          <AuctionCalendar events={calendarEvents} />
        </section>
      </div>
    </main>
  );
}
