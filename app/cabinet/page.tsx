import Link from "next/link";
import { redirect } from "next/navigation";
import { DeleteFavoriteButton } from "@/components/DeleteFavoriteButton";
import { DeleteSavedSearchButton } from "@/components/DeleteSavedSearchButton";
import { prisma } from "@/lib/prisma";
import { formatDateTime, formatEuro, shortAddress, translateStatus } from "@/lib/format";
import { getCurrentUser } from "@/lib/user-auth";

export const dynamic = "force-dynamic";

export default async function CabinetPage() {
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

  return (
    <main className="cabinet-page">
      <div className="container page-section">
        <section className="panel cabinet-hero">
          <div>
            <p className="eyebrow">Личный кабинет</p>
            <h1>{user.name || user.email}</h1>
            <p className="meta">Здесь сохраняются избранные объекты и поисковые фильтры.</p>
          </div>
          <div className="cabinet-stats">
            <a href="#favorites"><span>{favoriteCount}</span><b>Избранное</b></a>
            <a href="#searches"><span>{savedSearchCount}</span><b>Сохранённые поиски</b></a>
          </div>
        </section>

        <section id="favorites" className="panel cabinet-section">
          <div className="section-head">
            <div>
              <h2>Избранные объекты</h2>
              <p className="meta">Сортировка по ближайшей дате торгов.</p>
            </div>
            <Link className="btn btn-soft" href="/">Найти объекты</Link>
          </div>

          {sortedFavorites.length === 0 ? (
            <div className="empty-state compact">Пока нет избранных объектов.</div>
          ) : (
            <div className="cabinet-list">
              {sortedFavorites.map((favorite) => {
                const property = favorite.property;
                const image = property.images[0];

                return (
                  <article className="cabinet-item" key={favorite.id}>
                    <Link className="cabinet-thumb" href={`/properties/${property.id}`}>
                      {image ? <img src={image.url} alt={image.alt ?? property.title} /> : <span>Нет фото</span>}
                    </Link>
                    <div className="cabinet-item-main">
                      <p className="eyebrow">{property.city} · {translateStatus(property.status)}</p>
                      <h3><Link href={`/properties/${property.id}`}>{property.title}</Link></h3>
                      <p>{shortAddress(property.address)}</p>
                      <div className="tag-row">
                        <span>{formatEuro(property.marketValue)}</span>
                        <span>{formatDateTime(property.auctionDate, property.auctionTime)}</span>
                        <span>{property.court}</span>
                      </div>
                    </div>
                    <div className="cabinet-actions">
                      <Link className="btn btn-primary" href={`/properties/${property.id}`}>Открыть</Link>
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
              <h2>Сохранённые поиски</h2>
              <p className="meta">Фильтры сохраняются понятным текстом, а не техническими ID.</p>
            </div>
          </div>

          {savedSearches.length === 0 ? (
            <div className="empty-state compact">Пока нет сохранённых поисков.</div>
          ) : (
            <div className="saved-search-list">
              {savedSearches.map((savedSearch) => (
                <article className="saved-search-item" key={savedSearch.id}>
                  <div>
                    <h3>{savedSearch.name || "Сохранённый поиск"}</h3>
                    <p>{savedSearch.humanReadableSummary}</p>
                    <span className="meta">{savedSearch.createdAt.toLocaleDateString("ru-RU")}</span>
                  </div>
                  <div className="cabinet-actions">
                    <Link className="btn btn-primary" href={savedSearch.filtersUrl}>Открыть поиск</Link>
                    <DeleteSavedSearchButton searchId={savedSearch.id} />
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
