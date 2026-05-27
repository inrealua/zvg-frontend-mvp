import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatNumber } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function AdminExportPage() {
  const [total, active, cancelled, withoutImages, withoutDocuments, withoutCoordinates] = await Promise.all([
    prisma.property.count(),
    prisma.property.count({ where: { status: "ACTIVE" } }),
    prisma.property.count({ where: { status: "CANCELLED" } }),
    prisma.property.count({ where: { images: { none: {} } } }),
    prisma.property.count({ where: { documents: { none: {} } } }),
    prisma.property.count({ where: { OR: [{ latitude: null }, { longitude: null }] } })
  ]);

  return (
    <main className="admin-page">
      <section className="container admin-hero">
        <div>
          <p className="hero-kicker">Admin · Export</p>
          <h1>Экспорт объектов</h1>
          <p>
            Здесь можно выгрузить объекты из MySQL в CSV. Это удобно для проверки базы, передачи данных, резервного анализа в Excel
            и контроля качества после импорта.
          </p>
        </div>
        <div className="admin-actions-inline">
          <Link href="/admin/dashboard" className="btn btn-soft">Dashboard</Link>
          <Link href="/admin/quality" className="btn btn-soft">Quality</Link>
          <Link href="/admin" className="btn btn-primary">Объекты</Link>
        </div>
      </section>

      <section className="container page-section">
        <div className="admin-stats admin-stats-wide">
          <div><span>Всего</span><b>{formatNumber(total)}</b></div>
          <div><span>Активные</span><b>{formatNumber(active)}</b></div>
          <div><span>Отменённые</span><b>{formatNumber(cancelled)}</b></div>
          <div><span>Без фото</span><b>{formatNumber(withoutImages)}</b></div>
          <div><span>Без документов</span><b>{formatNumber(withoutDocuments)}</b></div>
          <div><span>Без координат</span><b>{formatNumber(withoutCoordinates)}</b></div>
        </div>

        <div className="export-layout">
          <form className="export-card export-form" action="/admin/export/download" method="get">
            <h2>Настроить CSV-выгрузку</h2>
            <p>
              Оставь поля пустыми, чтобы выгрузить все объекты. Файл будет создан сразу из текущей базы данных.
            </p>

            <div className="export-grid">
              <label>
                Поиск
                <input name="q" placeholder="Адрес, город, суд, Aktenzeichen" />
              </label>
              <label>
                Статус
                <select name="status" defaultValue="">
                  <option value="">Все</option>
                  <option value="ACTIVE">Активные</option>
                  <option value="CANCELLED">Отменённые</option>
                  <option value="ARCHIVED">Архив</option>
                  <option value="SOLD">Проданные</option>
                  <option value="UNKNOWN">Неизвестно</option>
                </select>
              </label>
              <label>
                Bundesland
                <input name="state" placeholder="Sachsen" />
              </label>
              <label>
                Gericht
                <input name="court" placeholder="Amtsgericht Chemnitz" />
              </label>
              <label>
                Stadt
                <input name="city" placeholder="Chemnitz" />
              </label>
              <label>
                Тип / группа
                <select name="group" defaultValue="">
                  <option value="">Все</option>
                  <option value="WOHNHAEUSER">Wohnhäuser</option>
                  <option value="WOHNUNGEN">Wohnungen</option>
                  <option value="GEWERBE">Gewerbe</option>
                  <option value="GRUNDSTUECKE">Grundstücke</option>
                  <option value="LAND_WALD">Land / Wald</option>
                  <option value="GARAGEN">Garagen</option>
                  <option value="SONSTIGE">Sonstige</option>
                </select>
              </label>
              <label>
                Торги от
                <input name="dateFrom" type="date" />
              </label>
              <label>
                Торги до
                <input name="dateTo" type="date" />
              </label>
              <label>
                Цена от
                <input name="priceMin" type="number" min="0" step="1000" />
              </label>
              <label>
                Цена до
                <input name="priceMax" type="number" min="0" step="1000" />
              </label>
              <label>
                Качество данных
                <select name="issue" defaultValue="">
                  <option value="">Без ограничения</option>
                  <option value="missing-coordinates">Без координат</option>
                  <option value="missing-images">Без фото</option>
                  <option value="missing-documents">Без документов</option>
                  <option value="missing-auction-date">Без даты торгов</option>
                  <option value="missing-market-value">Без Verkehrswert</option>
                </select>
              </label>
              <label>
                Лимит строк
                <select name="limit" defaultValue="5000">
                  <option value="100">100</option>
                  <option value="500">500</option>
                  <option value="1000">1000</option>
                  <option value="5000">5000</option>
                  <option value="20000">20000</option>
                </select>
              </label>
            </div>

            <div className="export-actions">
              <button className="btn btn-primary" type="submit">Скачать CSV</button>
              <Link className="btn" href="/admin/export">Сбросить форму</Link>
            </div>
          </form>

          <aside className="export-card export-help">
            <h2>Что будет в CSV</h2>
            <ul>
              <li>Aktenzeichen, Gericht, Bundesland, адрес и координаты.</li>
              <li>Дата/время торгов, статус, Verkehrswert, площади.</li>
              <li>Тип объекта, Nutzung, Denkmalschutz, Wertgrenzen.</li>
              <li>Количество фото и документов.</li>
              <li>Источник, sourceUrl, даты создания и обновления.</li>
            </ul>
            <p className="muted-note">
              Формат CSV сделан через точку с запятой <code>;</code>, чтобы файл нормально открывался в немецком Excel.
            </p>
            <div className="export-quick-links">
              <a className="btn btn-soft" href="/admin/export/download?status=ACTIVE&limit=5000">Активные</a>
              <a className="btn btn-soft" href="/admin/export/download?status=CANCELLED&limit=5000">Отменённые</a>
              <a className="btn btn-soft" href="/admin/export/download?issue=missing-images&limit=5000">Без фото</a>
              <a className="btn btn-soft" href="/admin/export/download?issue=missing-coordinates&limit=5000">Без координат</a>
            </div>
          </aside>
        </div>
      </section>
    </main>
  );
}
