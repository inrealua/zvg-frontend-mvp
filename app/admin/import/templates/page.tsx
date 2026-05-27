import Link from "next/link";
import { CSV_IMPORT_TEMPLATE, IMPORT_FIELDS, JSON_IMPORT_TEMPLATE } from "@/lib/import-templates";

export const dynamic = "force-dynamic";

export default function ImportTemplatesPage() {
  return (
    <main className="admin-page">
      <section className="container admin-hero">
        <div>
          <p className="hero-kicker">Admin · Import templates</p>
          <h1>Шаблоны импорта</h1>
          <p>
            Здесь находятся готовые шаблоны CSV и JSON для прямого импорта объектов в MySQL. Сначала можно скачать шаблон,
            заполнить его, проверить через валидацию и только потом импортировать.
          </p>
        </div>
        <div className="admin-actions-inline">
          <Link href="/admin/import" className="btn">← Импорт</Link>
          <Link href="/admin/import/validate" className="btn btn-soft">Проверить данные</Link>
          <a href="/admin/import/templates/csv" className="btn btn-primary">Скачать CSV</a>
          <a href="/admin/import/templates/json" className="btn btn-primary">Скачать JSON</a>
        </div>
      </section>

      <section className="container page-section import-template-grid">
        <div className="admin-card">
          <h2>Поля импорта</h2>
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Поле</th>
                  <th>Обязательное</th>
                  <th>Описание</th>
                </tr>
              </thead>
              <tbody>
                {IMPORT_FIELDS.map((field) => (
                  <tr key={field.name}>
                    <td><code>{field.name}</code></td>
                    <td>{field.required ? "Да" : "Нет"}</td>
                    <td>{field.description}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="admin-card">
          <h2>CSV пример</h2>
          <p className="muted-text">CSV сделан через точку с запятой <code>;</code>, чтобы его было удобно открывать в немецком Excel.</p>
          <pre className="template-preview">{CSV_IMPORT_TEMPLATE}</pre>
        </div>

        <div className="admin-card">
          <h2>JSON пример</h2>
          <p className="muted-text">JSON удобнее для импорта из скриптов и будущих парсеров.</p>
          <pre className="template-preview">{JSON_IMPORT_TEMPLATE}</pre>
        </div>
      </section>
    </main>
  );
}
