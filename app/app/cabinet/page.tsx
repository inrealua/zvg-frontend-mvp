import { getI18n } from "@/lib/i18n/server";
import { getUiText } from "@/lib/i18n/ui-texts";
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

export const dynamic = "force-dynamic";

export default async function CabinetPage() {
  const { locale } = await getI18n();
  const ui = getUiText(locale);
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/cabinet");

  const [favorites, savedSearches, favoriteCount, savedSearchCount] = await Promise.all([
    prisma.favorite.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      include: {
        property: {
          include: {
            images: {
              orderBy: [{ isMain: "desc" }, { sortOrder: "asc" }],
              take: 1
            }
          }
        }
      }
    }),
    prisma.savedSearch.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" }
    }),
    prisma.favorite.count({ where: { userId: user.id } }),
    prisma.savedSearch.count({ where: { userId: user.id } })
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
      const image = property.images[0];

      return {
        id: property.id,
        title: property.title,
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
    <main className="cabinet-page">
      <div className="container page-section">
        <section className="panel cabinet-hero cabinet-hero-compact">
          <div>
            <p className="eyebrow">Mein Konto</p>
            <h1>{user.name || user.email}</h1>
            <p className="meta">
              Favoriten, persönliche Notizen, gespeicherte Suchaufträge und Auktionstermine.
            </p>
          </div>
          <div className="cabinet-stats">
            <a href="#favorites"><span>{favoriteCount}</span><b>Favoriten</b></a>
            <a href="#searches"><span>{savedSearchCount}</span><b>Gespeicherte Suchen</b></a>
            <a href="#calendar"><span>{calendarEvents.length}</span><b>Kalendertermine</b></a>
          </div>
        </section>

        <section id="favorites" className="panel cabinet-section">
          <div className="section-head">
            <div>
              <h2>Favoriten</h2>
              <p className="meta">Sortiert nach dem nächsten Auktionstermin. Ihre Notizen sind sofort sichtbar und nur für Sie gespeichert.</p>
            </div>
            <Link className="btn btn-soft" href="/">Immobilien finden</Link>
          </div>

          {sortedFavorites.length === 0 ? (
            <div className="empty-state compact">Sie haben noch keine Favoriten gespeichert.</div>
          ) : (
            <div className="favorite-compact-list">
              {sortedFavorites.map((favorite) => {
                const property = favorite.property;
                const image = property.images[0];

                return (
                  <article className="favorite-compact-card" key={favorite.id}>
                    <Link className="favorite-compact-thumb" href={`/properties/${property.id}`}>
                      {image ? <img src={image.url} alt={image.alt ?? property.title} /> : <span>Kein Foto</span>}
                    </Link>

                    <div className="favorite-compact-main">
                      <div className="favorite-compact-topline">
                        <p className="eyebrow">{property.city} · {translateStatus(property.status)}</p>
                      </div>

                      <h3><Link href={`/properties/${property.id}`}>{property.title}</Link></h3>
                      <p className="favorite-compact-address">{shortAddress(property.address)}</p>

                      <div className="tag-row favorite-compact-tags">
                        <span>{formatEuro(property.marketValue)}</span>
                        <span>{formatDateTime(property.auctionDate, property.auctionTime)}</span>
                        <span>{property.court}</span>
                      </div>

                      <FavoriteNoteForm propertyId={property.id} initialNote={favorite.note ?? ""} />
                    </div>

                    <div className="favorite-compact-actions">
                      <Link className="btn btn-primary favorite-action-primary" href={`/properties/${property.id}`}>
                        Details
                      </Link>
                      <DeleteFavoriteButton propertyId={property.id} />
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
              <h2>Gespeicherte Suchen</h2>
              <p className="meta">
                Benennen Sie Ihre Suchaufträge. Später nutzen wir diese Namen für E-Mail-Benachrichtigungen.
              </p>
            </div>
          </div>

          {savedSearches.length === 0 ? (
            <div className="empty-state compact">Sie haben noch keine Suchen gespeichert.</div>
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
                    <span className="meta">{savedSearch.createdAt.toLocaleDateString("de-DE")}</span>
                  </div>
                  <div className="cabinet-actions">
                    <Link className="btn btn-primary" href={savedSearch.filtersUrl}>Suche öffnen</Link>
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
              <h2>Auktionskalender</h2>
              <p className="meta">
                Ihre favorisierten Objekte nach Auktionstermin. Bei mehreren Auktionen an einem Tag erscheint eine Tagesliste.
              </p>
            </div>
          </div>

          <AuctionCalendar events={calendarEvents} />
        </section>
      </div>
    </main>
  );
}
