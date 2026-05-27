import Link from "next/link";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function ImportLogsPage() {
  const logs = await prisma.importLog.findMany({
    orderBy: { createdAt: "desc" },
    take: 100
  });

  return (
    <main className="admin-page">
      <section className="container admin-hero">
        <div>
          <p className="hero-kicker">Admin · ImportLog</p>
          <h1>Логи импорта</h1>
          <p>Здесь видно, сколько объектов было создано, обновлено или пропущено при каждом импорте.</p>
        </div>
        <Link href="/admin/import" className="btn btn-primary">← Назад к импорту</Link>
      </section>

      <section className="container page-section">
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Дата</th>
                <th>Источник</th>
                <th>Формат</th>
                <th>Статус</th>
                <th>Всего</th>
                <th>Создано</th>
                <th>Обновлено</th>
                <th>Ошибки</th>
                <th>Сообщение</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id}>
                  <td>{log.createdAt.toLocaleString("ru-RU")}</td>
                  <td>{log.source}</td>
                  <td>{log.mode}</td>
                  <td><span className={`admin-status ${log.status.toLowerCase()}`}>{log.status}</span></td>
                  <td>{log.totalItems}</td>
                  <td>{log.createdItems}</td>
                  <td>{log.updatedItems}</td>
                  <td>{log.failedItems}</td>
                  <td><small>{log.errorMessage ?? "—"}</small></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {logs.length === 0 ? <div className="empty-box">Пока нет логов импорта.</div> : null}
      </section>
    </main>
  );
}
