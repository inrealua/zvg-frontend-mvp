import { getI18n } from "@/lib/i18n/server";
import { getUiText } from "@/lib/i18n/ui-texts";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { PropertyStatus } from "@prisma/client";
import type { Prisma } from "@prisma/client";
import { formatDate, formatEuro, formatNumber } from "@/lib/format";
import { AdminDeletePropertyButton } from "@/components/admin/AdminDeletePropertyButton";
import { getPropertyPlaceholder } from "@/lib/propertyPlaceholder";

type AdminSearchParams = Promise<Record<string, string | string[] | undefined>>;

export const dynamic = "force-dynamic";

export default async function AdminPage({ searchParams }: { searchParams: AdminSearchParams }) {
  const { locale } = await getI18n();
  const ui = getUiText(locale);
  const params = await searchParams;
  const q = typeof params.q === "string" ? params.q.trim() : "";
  const status = typeof params.status === "string" ? params.status.trim() : "";

  const where: Prisma.PropertyWhereInput = {};

  if (q) {
    where.OR = [
      { title: { contains: q } },
      { aktenzeichen: { contains: q } },
      { court: { contains: q } },
      { city: { contains: q } },
      { address: { contains: q } }
    ];
  }

  if (["ACTIVE", "CANCELLED", "ARCHIVED", "SOLD", "UNKNOWN"].includes(status)) {
    where.status = status as PropertyStatus;
  }

  const [properties, total, active, cancelled, archived, withoutImages, withoutDocuments] = await Promise.all([
    prisma.property.findMany({
      where,
      include: {
        images: { orderBy: [{ isMain: "desc" }, { sortOrder: "asc" }], take: 1 },
        _count: { select: { images: true, documents: true } }
      },
      orderBy: [{ updatedAt: "desc" }],
      take: 150
    }),
    prisma.property.count(),
    prisma.property.count({ where: { status: "ACTIVE" } }),
    prisma.property.count({ where: { status: "CANCELLED" } }),
    prisma.property.count({ where: { status: "ARCHIVED" } }),
    prisma.property.count({ where: { images: { none: {} } } }),
    prisma.property.count({ where: { documents: { none: {} } } })
  ]);

  return (
    <main className="admin-page">
      <section className="container admin-hero">
        <div>
          <p className="hero-kicker">Admin MVP · ручное управление объектами</p>
          <h1>Админ-панель объектов</h1>
          <p>
            Здесь можно создавать, редактировать и удалять объекты напрямую в базе. Теперь форма объекта также управляет документами.
          </p>
        </div>
        <div className="admin-actions-inline">
          <Link href="/admin/dashboard" className="btn btn-soft">Dashboard</Link>
          <Link href="/admin/import" className="btn btn-soft">Импорт JSON/CSV</Link>
          <Link href="/admin/import/logs" className="btn btn-soft">Логи импорта</Link>
          <Link href="/admin/properties/new" className="btn btn-primary">+ Добавить объект</Link>
        </div>
      </section>

      <section className="container page-section">
        <div className="admin-stats admin-stats-wide">
          <div><span>Всего</span><b>{formatNumber(total)}</b></div>
          <div><span>Активные</span><b>{formatNumber(active)}</b></div>
          <div><span>Отменённые</span><b>{formatNumber(cancelled)}</b></div>
          <div><span>Архив</span><b>{formatNumber(archived)}</b></div>
          <div><span>Без фото</span><b>{formatNumber(withoutImages)}</b></div>
          <div><span>Без документов</span><b>{formatNumber(withoutDocuments)}</b></div>
        </div>

        <form className="admin-toolbar" action="/admin">
          <input name="q" placeholder="Поиск: адрес, город, суд, Aktenzeichen" defaultValue={q} />
          <select name="status" defaultValue={status}>
            <option value="">Все статусы</option>
            <option value="ACTIVE">Активные</option>
            <option value="CANCELLED">Отменённые</option>
            <option value="ARCHIVED">Архив</option>
            <option value="SOLD">Проданные</option>
            <option value="UNKNOWN">Неизвестно</option>
          </select>
          <button className="btn btn-primary" type="submit">Найти</button>
          <Link className="btn" href="/admin">Сбросить</Link>
        </form>

        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Фото</th>
                <th>Объект</th>
                <th>Суд / дело</th>
                <th>Торги</th>
                <th>{ui.search.marketValue}</th>
                <th>Файлы</th>
                <th>Статус</th>
                <th>Действия</th>
              </tr>
            </thead>
            <tbody>
              {properties.map((property) => (
                <tr key={property.id}>
                  <td>
                    <div className="admin-thumb">
                      <img
                        src={
                          property.images[0]?.url ||
                          getPropertyPlaceholder(property.propertyType, property.propertyTypeGroup)
                        }
                        alt={property.title}
                      />
                    </div>
                  </td>
                  <td>
                    <strong>{property.title}</strong>
                    <small>{property.address}</small>
                    <small>{property.propertyType} · {property.city}</small>
                  </td>
                  <td>
                    <strong>{property.court}</strong>
                    <small>{property.aktenzeichen}</small>
                  </td>
                  <td>
                    <strong>{formatDate(property.auctionDate)}</strong>
                    <small>{property.auctionTime ?? "—"}</small>
                  </td>
                  <td>{formatEuro(property.marketValue)}</td>
                  <td>
                    <div className="admin-file-counts">
                      <span>{property._count.images} фото</span>
                      <span>{property._count.documents} док.</span>
                    </div>
                  </td>
                  <td><span className={`admin-status ${property.status.toLowerCase()}`}>{property.status}</span></td>
                  <td>
                    <div className="admin-row-actions">
                      <Link className="btn btn-soft" href={`/properties/${property.id}`}>Открыть</Link>
                      <Link className="btn" href={`/admin/properties/${property.id}/edit`}>Редактировать</Link>
                      <AdminDeletePropertyButton propertyId={property.id} className="btn btn-danger" />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {properties.length === 0 ? <div className="empty-box">По этому поиску объекты не найдены.</div> : null}
      </section>
    
      <Link href="/admin/users" className="admin-users-link-stage109">
        <strong>Пользователи</strong>
        <span>Просмотр зарегистрированных пользователей и ролей</span>
      </Link>

    </main>
  );
}
