# Stage 47A — чистое меню + основа мультиязычности

Этот этап НЕ меняет базу данных.

## Что исправлено

- `Immobilien finden` заменяется на `Startseite / Главная / Home`.
- `Karte` заменяется на `Erweiterte Suche / Расширенный поиск / Advanced Search`.
- `Favoriten` убран из меню, потому что это часть кабинета.
- `Über uns` и `Datenschutz` перенесены в footer.
- `Admin` больше не показывается обычному пользователю.
- Добавлен переключатель языка `DE / RU / EN`.
- Язык хранится в cookie `zvg_locale`.

## Установка

1. Backup:

```powershell
Copy-Item -Recurse D:\Projects\zvg_frontend_mvp D:\Projects\zvg_frontend_mvp_backup_stage47a
```

2. Скопировать из архива папки `app`, `components`, `lib` в проект.

3. Добавить содержимое `STAGE47A_CSS_APPEND.css` в конец `app/globals.css`.

4. Проверить:

```powershell
npm run build
npm run dev
```

5. Deploy:

```powershell
git add .
git commit -m "Add multilingual navigation foundation"
git push
```
