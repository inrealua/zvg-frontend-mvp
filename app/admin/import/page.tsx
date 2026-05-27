import Link from "next/link";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { importPayloadToDatabase } from "@/lib/import-utils";

export const dynamic = "force-dynamic";

type ImportSearchParams = Promise<Record<string, string | string[] | undefined>>;

const sampleJson = JSON.stringify(
  [
    {
      aktenzeichen: "0099 K 0001/2026",
      court: "Amtsgericht Chemnitz",
      state: "Sachsen",
      city: "Chemnitz",
      postalCode: "09111",
      street: "Teststraße",
      houseNumber: "1",
      title: "Testobjekt Import Einfamilienhaus",
      propertyType: "Einfamilienhaus",
      propertyTypeGroup: "WOHNHAEUSER",
      status: "ACTIVE",
      occupancyStatus: "VACANT",
      auctionDate: "2026-07-15",
      auctionTime: "10:00",
      marketValue: 99000,
      livingArea: 120,
      plotArea: 650,
      latitude: 50.8323,
      longitude: 12.9253,
      description: "Testimport aus JSON. Dieses Objekt dient nur zur Prüfung des Imports.",
      imageUrls: ["https://images.unsplash.com/photo-1564013799919-ab600027ffc6?q=80&w=1200"],
      documentUrls: ["https://example.com/gutachten.pdf"]
    }
  ],
  null,
  2
);

const sampleCsv = `aktenzeichen;court;state;city;postalCode;street;houseNumber;title;propertyType;propertyTypeGroup;status;auctionDate;auctionTime;marketValue;livingArea;plotArea;description
0099 K 0002/2026;Amtsgericht Dresden;Sachsen;Dresden;01067;Importstraße;2;Testobjekt CSV Wohnung;Eigentumswohnung;WOHNUNGEN;ACTIVE;2026-08-20;11:30;75000;68;0;Testimport aus CSV`;

async function importAction(formData: FormData) {
  "use server";

  const modeValue = formData.get("mode");
  const payloadValue = formData.get("payload");
  const mode = modeValue === "CSV" ? "CSV" : "JSON";
  const payload = typeof payloadValue === "string" ? payloadValue.trim() : "";

  if (!payload) {
    redirect("/admin/import?error=empty");
  }

  const log = await importPayloadToDatabase({ mode, payload, source: "ADMIN_TEXT_IMPORT" });
  revalidatePath("/");
  revalidatePath("/admin");
  revalidatePath("/admin/import");
  redirect(`/admin/import?logId=${log.id}`);
}

export default async function AdminImportPage({ searchParams }: { searchParams: ImportSearchParams }) {
  const params = await searchParams;
  const logId = typeof params.logId === "string" ? params.logId : "";
  const error = typeof params.error === "string" ? params.error : "";

  const [latestLogs, selectedLog] = await Promise.all([
    prisma.importLog.findMany({ orderBy: { createdAt: "desc" }, take: 10 }),
    logId ? prisma.importLog.findUnique({ where: { id: logId } }) : Promise.resolve(null)
  ]);

  return (
    <main className="admin-page">
      <section className="container admin-hero">
        <div>
          <p className="hero-kicker">Admin · импорт напрямую в MySQL</p>
          <h1>Импорт объектов</h1>
          <p>
            Здесь можно загрузить JSON или CSV, чтобы создать новые объекты или обновить существующие по паре
            <strong> Aktenzeichen + Gericht</strong>. Парсеры и AI пока не используются.
          </p>
        </div>
        <div className="admin-actions-inline">
          <Link href="/admin" className="btn">← К объектам</Link>
          <Link href="/admin/import/logs" className="btn btn-soft">Логи импорта</Link>
        </div>
      </section>

      <section className="container import-grid">
        <div className="admin-card import-form-card">
          <h2>Загрузить данные</h2>
          <p className="muted-text">
            Обязательные поля: <code>aktenzeichen</code>, <code>court</code>, <code>title</code>, <code>address</code> или данные для адреса.
          </p>
          {error === "empty" ? <div className="alert-box danger">Вставь JSON или CSV перед импортом.</div> : null}
          {selectedLog ? (
            <div className={`alert-box ${selectedLog.status.toLowerCase()}`}>
              <strong>Последний импорт: {selectedLog.status}</strong>
              <span>
                Всего: {selectedLog.totalItems} · создано: {selectedLog.createdItems} · обновлено: {selectedLog.updatedItems} · ошибок: {selectedLog.failedItems}
              </span>
              {selectedLog.errorMessage ? <pre>{selectedLog.errorMessage}</pre> : null}
            </div>
          ) : null}

          <form action={importAction} className="import-form">
            <label>
              Формат
              <select name="mode" defaultValue="JSON">
                <option value="JSON">JSON</option>
                <option value="CSV">CSV</option>
              </select>
            </label>
            <label>
              Данные для импорта
              <textarea name="payload" rows={18} placeholder="Вставь JSON-массив или CSV с заголовком" />
            </label>
            <button type="submit" className="btn btn-primary">Импортировать в базу</button>
          </form>
        </div>

        <aside className="admin-card import-help-card">
          <h2>Примеры</h2>
          <p className="muted-text">Скопируй пример в поле импорта, чтобы проверить работу.</p>
          <details open>
            <summary>JSON пример</summary>
            <pre>{sampleJson}</pre>
          </details>
          <details>
            <summary>CSV пример</summary>
            <pre>{sampleCsv}</pre>
          </details>
          <h3>Поддерживаемые поля</h3>
          <p className="muted-text">
            aktenzeichen, court, state, city, postalCode, street, houseNumber, address, latitude, longitude, title,
            propertyType, propertyTypeGroup, status, occupancyStatus, auctionDate, auctionTime, marketValue,
            livingArea, plotArea, description, imageUrls, documentUrls.
          </p>
        </aside>
      </section>

      <section className="container page-section">
        <div className="section-heading">
          <div>
            <p className="hero-kicker">Последние операции</p>
            <h2>Последние логи импорта</h2>
          </div>
        </div>
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Дата</th>
                <th>Формат</th>
                <th>Статус</th>
                <th>Всего</th>
                <th>Создано</th>
                <th>Обновлено</th>
                <th>Ошибки</th>
              </tr>
            </thead>
            <tbody>
              {latestLogs.map((log) => (
                <tr key={log.id}>
                  <td>{log.createdAt.toLocaleString("ru-RU")}</td>
                  <td>{log.mode}</td>
                  <td><span className={`admin-status ${log.status.toLowerCase()}`}>{log.status}</span></td>
                  <td>{log.totalItems}</td>
                  <td>{log.createdItems}</td>
                  <td>{log.updatedItems}</td>
                  <td>{log.failedItems}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
