import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { formatDate, formatEuro, formatNumber } from "@/lib/format";
import { AnalysisPublicationControls } from "@/components/admin/AnalysisPublicationControls";
import { getPropertyPlaceholder } from "@/lib/propertyPlaceholder";

export const dynamic = "force-dynamic";

type Params = Promise<Record<string, string | string[] | undefined>>;
const allowed = ["IMPORTED", "REVIEW", "READY", "PUBLISHED", "ARCHIVED"] as const;

export default async function AdminAnalysisPage({ searchParams }: { searchParams: Params }) {
  if (!(await isAdminAuthenticated())) redirect("/admin/login");
  const params = await searchParams;
  const requested = typeof params.status === "string" ? params.status.toUpperCase() : "";
  const status = allowed.includes(requested as any) ? requested : "";

  const where: any = { canonicalId: { not: null } };
  if (status) where.publicationStatus = status;

  const [properties, total, review, ready, published, archived] = await Promise.all([
    prisma.property.findMany({
      where,
      include: {
        images: { orderBy: [{ isMain: "desc" }, { sortOrder: "asc" }], take: 1 },
        translations: { where: { locale: "RU" }, take: 1 },
      },
      orderBy: [{ updatedAt: "desc" }],
      take: 250,
    }),
    prisma.property.count({ where: { canonicalId: { not: null } } }),
    prisma.property.count({ where: { canonicalId: { not: null }, publicationStatus: "REVIEW" } }),
    prisma.property.count({ where: { canonicalId: { not: null }, publicationStatus: "READY" } }),
    prisma.property.count({ where: { canonicalId: { not: null }, publicationStatus: "PUBLISHED" } }),
    prisma.property.count({ where: { canonicalId: { not: null }, publicationStatus: "ARCHIVED" } }),
  ]);

  return (
    <main className="admin-page">
      <section className="container admin-hero">
        <div>
          <p className="hero-kicker">AI Analysis · публикация</p>
          <h1>Проверка проанализированных объектов</h1>
          <p>Импортированные AI-объекты сначала остаются скрытыми. Здесь можно проверить карточку и только затем опубликовать её.</p>
        </div>
        <div className="admin-actions-inline">
          <Link href="/admin" className="btn btn-soft">Все объекты</Link>
          <Link href="/admin/dashboard" className="btn btn-soft">Dashboard</Link>
        </div>
      </section>

      <section className="container page-section">
        <div className="admin-stats admin-stats-wide">
          <div><span>AI объектов</span><b>{formatNumber(total)}</b></div>
          <div><span>На проверке</span><b>{formatNumber(review)}</b></div>
          <div><span>Готовы</span><b>{formatNumber(ready)}</b></div>
          <div><span>Опубликованы</span><b>{formatNumber(published)}</b></div>
          <div><span>Архив</span><b>{formatNumber(archived)}</b></div>
        </div>

        <div className="analysis-admin-filter-row">
          <Link href="/admin/analysis" className={`btn ${!status ? "btn-primary" : "btn-soft"}`}>Все</Link>
          {allowed.map((s) => <Link key={s} href={`/admin/analysis?status=${s}`} className={`btn ${status === s ? "btn-primary" : "btn-soft"}`}>{s}</Link>)}
        </div>

        <div className="admin-table-wrap">
          <table className="admin-table analysis-admin-table">
            <thead>
              <tr>
                <th>Фото</th><th>Объект</th><th>AI</th><th>Торги</th><th>Статус публикации</th><th>Действия</th>
              </tr>
            </thead>
            <tbody>
              {properties.map((p) => {
                const title = p.translations[0]?.title || p.title;
                return (
                  <tr key={p.id}>
                    <td><div className="admin-thumb"><img src={p.images[0]?.url || getPropertyPlaceholder(p.propertyType, p.propertyTypeGroup)} alt={title} /></div></td>
                    <td>
                      <strong>{title}</strong>
                      <small>{p.address}</small>
                      <small>{p.canonicalId}</small>
                      <small>{p.court} · {p.aktenzeichen}</small>
                    </td>
                    <td>
                      <strong>{p.investmentScore != null ? `${p.investmentScore}/100` : "—"} {p.investmentRecommendation ? `· ${p.investmentRecommendation}` : ""}</strong>
                      <small>Макс. ставка: {formatEuro(p.bidMaximumEur)}</small>
                      <small>Рынок: {formatEuro(p.analyzedMarketValueBaseEur)}</small>
                    </td>
                    <td><strong>{formatDate(p.auctionDate)}</strong><small>{p.auctionTime || "—"}</small><small>{p.status}</small></td>
                    <td><span className={`admin-status analysis-${p.publicationStatus.toLowerCase()}`}>{p.publicationStatus}</span></td>
                    <td>
                      <div className="admin-row-actions analysis-admin-actions">
                        <Link href={`/properties/${p.id}`} className="btn btn-soft" target="_blank">Предпросмотр</Link>
                        <AnalysisPublicationControls propertyId={p.id} currentStatus={p.publicationStatus as any} />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {!properties.length ? <div className="empty-box">Нет AI-объектов с выбранным статусом.</div> : null}
      </section>
    </main>
  );
}
