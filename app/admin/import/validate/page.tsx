import Link from "next/link";
import { redirect } from "next/navigation";
import { validateImportPayload } from "@/lib/import-validation";
import { CSV_IMPORT_TEMPLATE, JSON_IMPORT_TEMPLATE } from "@/lib/import-templates";

export const dynamic = "force-dynamic";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

type ValidationResult = ReturnType<typeof validateImportPayload> | null;

function first(value: string | string[] | undefined) {
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
}

async function validateAction(formData: FormData) {
  "use server";

  const modeValue = formData.get("mode");
  const payloadValue = formData.get("payload");
  const mode = modeValue === "CSV" ? "CSV" : "JSON";
  const payload = typeof payloadValue === "string" ? payloadValue.trim() : "";
  const encodedMode = encodeURIComponent(mode);
  const encodedPayload = encodeURIComponent(payload);

  redirect(`/admin/import/validate?mode=${encodedMode}&payload=${encodedPayload}`);
}

export default async function ImportValidatePage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const mode = first(params.mode) === "CSV" ? "CSV" : "JSON";
  const payload = first(params.payload);
  let result: ValidationResult = null;
  let parseError = "";

  if (payload) {
    try {
      result = validateImportPayload(mode, payload);
    } catch (error) {
      parseError = error instanceof Error ? error.message : "Неизвестная ошибка чтения данных.";
    }
  }

  const sample = mode === "CSV" ? CSV_IMPORT_TEMPLATE : JSON_IMPORT_TEMPLATE;

  return (
    <main className="admin-page">
      <section className="container admin-hero">
        <div>
          <p className="hero-kicker">Admin · Import validation</p>
          <h1>Проверка импорта без записи в базу</h1>
          <p>
            Вставь CSV или JSON и проверь ошибки до реального импорта. Эта страница ничего не записывает в MySQL.
          </p>
        </div>
        <div className="admin-actions-inline">
          <Link href="/admin/import" className="btn">← Импорт</Link>
          <Link href="/admin/import/templates" className="btn btn-soft">Шаблоны</Link>
        </div>
      </section>

      <section className="container import-grid">
        <div className="admin-card import-form-card">
          <h2>Данные для проверки</h2>
          <form action={validateAction} className="import-form">
            <label>
              Формат
              <select name="mode" defaultValue={mode}>
                <option value="JSON">JSON</option>
                <option value="CSV">CSV</option>
              </select>
            </label>
            <label>
              Данные
              <textarea name="payload" rows={18} defaultValue={payload || sample} />
            </label>
            <button type="submit" className="btn btn-primary">Проверить без импорта</button>
          </form>
        </div>

        <aside className="admin-card import-help-card">
          <h2>Результат проверки</h2>
          {parseError ? <div className="alert-box danger"><strong>Ошибка чтения файла</strong><pre>{parseError}</pre></div> : null}
          {!payload && !parseError ? <p className="muted-text">Вставь данные и нажми “Проверить без импорта”.</p> : null}
          {result ? (
            <div className="validation-summary">
              <div className={result.summary.canImport ? "alert-box success" : "alert-box danger"}>
                <strong>{result.summary.canImport ? "Можно импортировать" : "Есть критические ошибки"}</strong>
                <span>
                  Строк: {result.summary.totalRows} · готово: {result.summary.readyRows} · ошибок: {result.summary.errorCount} · предупреждений: {result.summary.warningCount}
                </span>
                <span>Фото: {result.summary.imageCount} · документы: {result.summary.documentCount}</span>
              </div>
              <div className="admin-actions-inline validation-actions">
                <Link href="/admin/import" className="btn btn-primary">Перейти к импорту</Link>
                <Link href="/admin/import/templates" className="btn">Шаблоны</Link>
              </div>
            </div>
          ) : null}
        </aside>
      </section>

      {result ? (
        <section className="container page-section">
          <div className="section-heading">
            <div>
              <p className="hero-kicker">Validation report</p>
              <h2>Ошибки и предупреждения</h2>
            </div>
          </div>
          {result.issues.length === 0 ? (
            <div className="admin-card"><p>Проблем не найдено.</p></div>
          ) : (
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Строка</th>
                    <th>Уровень</th>
                    <th>Поле</th>
                    <th>Сообщение</th>
                  </tr>
                </thead>
                <tbody>
                  {result.issues.map((issue, index) => (
                    <tr key={`${issue.row}-${issue.field}-${index}`}>
                      <td>{issue.row}</td>
                      <td><span className={`admin-status ${issue.level === "error" ? "failed" : "partial"}`}>{issue.level}</span></td>
                      <td><code>{issue.field}</code></td>
                      <td>{issue.message}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      ) : null}
    </main>
  );
}
