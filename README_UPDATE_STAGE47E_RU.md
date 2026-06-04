# Stage 47E — full UI dictionary patch

Этот пакет нужен, потому что в присланном файле всё ещё видны hardcoded немецкие тексты в карточках, кабинете и страницах объектов, а также старые вызовы `translateGroup / translateStatus / translateOccupancy`. fileciteturn12file0

## Что внутри

- `lib/i18n/ui-texts.ts`
- `scripts/stage47e_patch_hardcoded_ui_texts.mjs`
- `STAGE47E_CSS_APPEND.css`

## Установка

1. Backup:

```powershell
Copy-Item -Recurse D:\Projects\zvg_frontend_mvp D:\Projects\zvg_frontend_mvp_backup_stage47e
```

2. Скопировать папки:

```txt
lib
scripts
```

в проект:

```txt
D:\Projects\zvg_frontend_mvp
```

3. Добавить CSS из `STAGE47E_CSS_APPEND.css` в конец:

```txt
app/globals.css
```

4. Запустить patch:

```powershell
node .\scripts\stage47e_patch_hardcoded_ui_texts.mjs
```

5. Проверить:

```powershell
npm run build
npm run dev
```

Если build упадёт на конкретном `.tsx`, пришлите ошибку и этот файл.

## Цель

При RU должны стать русскими:
- hero;
- быстрый поиск;
- расширенный поиск;
- карта;
- подписи фильтров;
- кнопки;
- статистика.

При DE и EN — соответствующие немецкие и английские тексты.
