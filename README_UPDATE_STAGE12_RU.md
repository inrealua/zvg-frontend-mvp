# Stage 12 — документы объекта в админке

Этот пакет добавляет ручное управление документами объекта в админ-панели.

## Что добавляется

- Поля документов в форме создания объекта.
- Поля документов в форме редактирования объекта.
- Разделение документов по типам:
  - Gutachten / Verkehrswertgutachten
  - Amtliche Bekanntmachung
  - Exposé
  - Прочие документы
- Поддержка формата `URL | filename.pdf`.
- В админ-таблице теперь видно количество фото и документов.
- База данных не меняется, потому что таблица `PropertyDocument` уже есть.

## Как поставить

1. Сделай backup проекта:

```powershell
Copy-Item -Recurse D:\Projects\zvg_frontend_mvp D:\Projects\zvg_frontend_mvp_backup_stage12
```

2. Распакуй архив `zvg_stage12_admin_documents_update_files.zip`.

3. Скопируй папки `app`, `components`, `lib` поверх проекта:

```txt
D:\Projects\zvg_frontend_mvp
```

4. Проверь сборку:

```powershell
cd D:\Projects\zvg_frontend_mvp
npm run build
```

5. Проверь локально:

```powershell
npm run dev
```

Открой:

```txt
http://localhost:3000/admin
```

Проверь:

- в таблице админки появились счётчики `фото` и `док.`;
- при создании объекта появились поля документов;
- при редактировании объекта документы можно менять;
- на странице объекта документы отображаются в разделе документов.

6. Отправь на GitHub:

```powershell
git add .
git commit -m "Add admin document management"
git push
```

## Важно

`npm run db:push` для этого этапа не нужен.
`npm run db:seed` не запускай, чтобы не перезаписать данные.
