import { getI18n } from "@/lib/i18n/server";
import { getUiText } from "@/lib/i18n/ui-texts";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatDate, formatEuro, formatNumber, translateGroup, translateStatus } from "@/lib/format";

export const dynamic = "force-dynamic";

type BarRow = {
  label: string;
  value: number;
  href?: string;
};

function percent(value: number, total: number) {
  if (total <= 0) return 0;
  return Math.round((value / total) * 100);
}

function DashboardBars({ title, rows, total }: { title: string; rows: BarRow[]; total: number }) {
  return (
    <section className="dashboard-panel">
      <div className="dashboard-panel-head">
        <h2>{title}</h2>
        <span>{formatNumber(total)} всего</span>
      </div>
      <div className="dashboard-bars">
        {rows.length === 0 ? <p className="muted-text">Нет данных для отображения.</p> : null}
        {rows.map((row) => {
          const width = percent(row.value, total);
          const content = (
            <>
              <div className="dashboard-bar-meta">
                <span>{row.label}</span>
                <b>{formatNumber(row.value)} · {width}%</b>
              </div>
              <div className="dashboard-bar-track" aria-hidden="true">
                <div className="dashboard-bar-fill" style={{ width: `${Math.max(width, row.value > 0 ? 3 : 0)}%` }} />
              </div>
            </>
          );

          return row.href ? (
            <Link className="dashboard-bar-row" href={row.href} key={row.label}>{content}</Link>
          ) : (
            <div className="dashboard-bar-row" key={row.label}>{content}</div>
          );
        })}
      </div>
    </section>
  );
}

export default async function AdminDashboardPage() {
  const { locale } = await getI18n();
  const ui = getUiText(locale);
  const now = new Date();
  const next30Days = new Date(now);
  next30Days.setDate(next30Days.getDate() + 30);

  const [
    total,
    active,
    cancelled,
    archived,
    sold,
    withoutCoordinates,
    withoutImages,
    withoutDocuments,
    withoutAuctionDate,
    denkmalschutz,
    wertgrenzenWeggefallen,
    nextAuctions,
    statusGroups,
    stateGroups,
    typeGroups,
    recentObjects,
    recentImports
  ] = await Promise.all([
    prisma.property.count(),
    prisma.property.count({ where: { status: "ACTIVE" } }),
    prisma.property.count({ where: { status: "CANCELLED" } }),
    prisma.property.count({ where: { status: "ARCHIVED" } }),
    prisma.property.count({ where: { status: "SOLD" } }),
    prisma.property.count({ where: { OR: [{ latitude: null }, { longitude: null }] } }),
    prisma.property.count({ where: { images: { none: {} } } }),
    prisma.property.count({ where: { documents: { none: {} } } }),
    prisma.property.count({ where: { auctionDate: null } }),
    prisma.property.count({ where: { hasDenkmalschutz: true } }),
    prisma.property.count({ where: { wertgrenzenWeggefallen: true } }),
    prisma.property.count({ where: { status: "ACTIVE", auctionDate: { gte: now, lte: next30Days } } }),
    prisma.property.groupBy({ by: ["status"], _count: { _all: true }, orderBy: { _count: { status: "desc" } } }),
    prisma.property.groupBy({ by: ["state"], _count: { _all: true }, orderBy: { _count: { state: "desc" } }, take: 12 }),
    prisma.property.groupBy({ by: ["propertyTypeGroup"], _count: { _all: true }, orderBy: { _count: { propertyTypeGroup: "desc" } } }),
    prisma.property.findMany({
      select: {
        id: true,
        title: true,
        address: true,
        city: true,
        court: true,
        aktenzeichen: true,
        status: true,
        auctionDate: true,
        auctionTime: true,
        marketValue: true,
        updatedAt: true,
        _count: { select: { images: true, documents: true } }
      },
      orderBy: { updatedAt: "desc" },
      take: 10
    }),
    prisma.importLog.findMany({
      select: {
        id: true,
        source: true,
        mode: true,
        status: true,
        totalItems: true,
        createdItems: true,
        updatedItems: true,
        failedItems: true,
        createdAt: true
      },
      orderBy: { createdAt: "desc" },
      take: 5
    })
  ]);

  const statusRows: BarRow[] = statusGroups.map((item) => ({
    label: translateStatus(item.status),
    value: item._count._all,
    href: `/admin?status=${item.status}`
  }));

  const stateRows: BarRow[] = stateGroups.map((item) => ({
    label: item.state,
    value: item._count._all,
    href: `/?state=${encodeURIComponent(item.state)}`
  }));

  const typeRows: BarRow[] = typeGroups.map((item) => ({
    label: translateGroup(item.propertyTypeGroup),
    value: item._count._all,
    href: `/?group=${item.propertyTypeGroup}`
  }));

  return (
    <main className="admin-page">
      <section className="container admin-hero">
        <div>
          <p className="hero-kicker">Admin · Datenqualität · Übersicht</p>
          <h1>Dashboard проекта</h1>
          <p>
            Быстрый контроль базы: статусы объектов, качество данных, ближайшие торги, последние изменения и импорт.
          </p>
        </div>
        <div className="admin-actions-inline">
          <Link href="/admin" className="btn btn-soft">Все объекты</Link>
          <Link href="/admin/import" className="btn btn-soft">Импорт</Link>
          <Link href="/admin/properties/new" className="btn btn-primary">+ Добавить объект</Link>
        </div>
      </section>

      <section className="container page-section">
        <div className="dashboard-kpi-grid">
          <div className="dashboard-kpi"><span>Всего объектов</span><b>{formatNumber(total)}</b></div>
          <div className="dashboard-kpi"><span>Активные</span><b>{formatNumber(active)}</b></div>
          <div className="dashboard-kpi"><span>Отменённые</span><b>{formatNumber(cancelled)}</b></div>
          <div className="dashboard-kpi"><span>Ближайшие 30 дней</span><b>{formatNumber(nextAuctions)}</b></div>
          <div className="dashboard-kpi"><span>{ui.search.heritage}</span><b>{formatNumber(denkmalschutz)}</b></div>
          <div className="dashboard-kpi"><span>Wertgrenzen weg</span><b>{formatNumber(wertgrenzenWeggefallen)}</b></div>
        </div>

        <div className="dashboard-quality-grid">
          <Link href="/admin" className="dashboard-quality-card good">
            <span>Активные в работе</span>
            <b>{formatNumber(active)}</b>
            <small>Объекты, доступные пользователям как активные.</small>
          </Link>
          <Link href="/admin?status=CANCELLED" className="dashboard-quality-card warning">
            <span>Отменённые</span>
            <b>{formatNumber(cancelled)}</b>
            <small>Проверь, нужно ли убирать из активной выдачи.</small>
          </Link>
          <Link href="/admin?status=ARCHIVED" className="dashboard-quality-card neutral">
            <span>Архив / продано</span>
            <b>{formatNumber(archived + sold)}</b>
            <small>Не должны мешать основному поиску.</small>
          </Link>
          <div className="dashboard-quality-card danger">
            <span>Без координат</span>
            <b>{formatNumber(withoutCoordinates)}</b>
            <small>Такие объекты не появятся на карте.</small>
          </div>
          <div className="dashboard-quality-card danger">
            <span>Без фото</span>
            <b>{formatNumber(withoutImages)}</b>
            <small>Плохо выглядят в списке и карточке.</small>
          </div>
          <div className="dashboard-quality-card warning">
            <span>Без документов</span>
            <b>{formatNumber(withoutDocuments)}</b>
            <small>Нет Gutachten / Bekanntmachung / Exposé.</small>
          </div>
          <div className="dashboard-quality-card warning">
            <span>Без даты торгов</span>
            <b>{formatNumber(withoutAuctionDate)}</b>
            <small>Нельзя корректно сортировать по срокам.</small>
          </div>
        </div>

        <div className="dashboard-panels-grid">
          <DashboardBars title="По статусам" rows={statusRows} total={total} />
          <DashboardBars title="По Bundesland" rows={stateRows} total={total} />
          <DashboardBars title="По типам недвижимости" rows={typeRows} total={total} />
        </div>

        <section className="dashboard-panel">
          <div className="dashboard-panel-head">
            <h2>Последние изменённые объекты</h2>
            <span>Топ 10</span>
          </div>
          <div className="dashboard-table-wrap">
            <table className="admin-table dashboard-table">
              <thead>
                <tr>
                  <th>Объект</th>
                  <th>Суд / дело</th>
                  <th>Торги</th>
                  <th>Цена</th>
                  <th>Файлы</th>
                  <th>Статус</th>
                  <th>Действия</th>
                </tr>
              </thead>
              <tbody>
                {recentObjects.map((property) => (
                  <tr key={property.id}>
                    <td>
                      <strong>{property.title}</strong>
                      <small>{property.address}</small>
                      <small>{property.city}</small>
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
                        <Link href={`/properties/${property.id}`} className="btn btn-soft">Открыть</Link>
                        <Link href={`/admin/properties/${property.id}/edit`} className="btn">Редактировать</Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="dashboard-panel">
          <div className="dashboard-panel-head">
            <h2>Последние импорты</h2>
            <Link href="/admin/import/logs">Все логи</Link>
          </div>
          {recentImports.length === 0 ? (
            <p className="muted-text">Импортов пока нет.</p>
          ) : (
            <div className="import-mini-list">
              {recentImports.map((item) => (
                <Link href={`/admin/import/logs`} className="import-mini-card" key={item.id}>
                  <div>
                    <strong>{item.source} · {item.mode}</strong>
                    <span>{formatDate(item.createdAt)} · {item.status}</span>
                  </div>
                  <div>
                    <b>{formatNumber(item.totalItems)}</b>
                    <span>создано {item.createdItems}, обновлено {item.updatedItems}, ошибок {item.failedItems}</span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>
      </section>
    </main>
  );
}
