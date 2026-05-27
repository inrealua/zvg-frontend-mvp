# Stage 9 — фильтр по видимой области карты

Этот пакет добавляет фильтрацию объектов по текущей видимой области карты.

## Что появляется

- кнопка `Искать в этой области карты` на карте;
- координаты текущей видимой области карты записываются в URL;
- база фильтрует объекты по `latitude` и `longitude`;
- фильтр области карты работает вместе с другими фильтрами;
- активный фильтр отображается как chip `Область карты`;
- при удалении chip удаляются сразу `minLat`, `maxLat`, `minLng`, `maxLng`;
- база данных и Prisma-схема не меняются.

## Как установить

1. Сделай backup:

```powershell
Copy-Item -Recurse D:\Projects\zvg_frontend_mvp D:\Projects\zvg_frontend_mvp_backup_stage9
```

2. Распакуй архив `zvg_stage9_map_area_update_files.zip`.

3. Скопируй папки:

```txt
app
components
lib
```

в:

```txt
D:\Projects\zvg_frontend_mvp
```

Windows спросит заменить файлы — нажми `Да`.

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
http://localhost:3000
```

Проверка:

1. открой главную страницу;
2. приблизь карту, например к Sachsen/Thüringen;
3. нажми `Искать в этой области карты`;
4. список должен обновиться;
5. в активных фильтрах появится `Область карты`;
6. нажми `×` на этом фильтре — должны удалиться только координаты области карты.

6. Отправь на GitHub:

```powershell
git add .
git commit -m "Add map area search filter"
git push
```

После `git push` Vercel сам запустит новый деплой.

## Важно

`npm run db:push` для этого этапа не нужен, потому что схема базы не меняется.
