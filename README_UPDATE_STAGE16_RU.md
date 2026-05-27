# Stage 16 — поиск и объединение дублей

Этот пакет добавляет страницу `/admin/duplicates` для поиска и объединения дублей объектов.

## Что добавляется

- `/admin/duplicates` — список групп дублей.
- Группировка по `normalizedAktenzeichen + court`.
- Выбор главного объекта в группе.
- Перенос фото из дублей в главный объект.
- Перенос документов из дублей в главный объект.
- Перенос избранного пользователей на главный объект.
- Удаление дублей после объединения.
- Автоматическая проверка главного фото после объединения.
- Ссылка `Duplicates` в верхнем меню админки.

## Важно

Перед нажатием **«Объединить выбранную группу»** обязательно проверь:

1. адрес объекта;
2. Aktenzeichen;
3. Amtsgericht;
4. дату торгов;
5. источник.

Система специально разрешает объединять только записи с одинаковой парой:

```txt
normalizedAktenzeichen + court
```

## Как поставить

1. Сделай backup:

```powershell
Copy-Item -Recurse D:\Projects\zvg_frontend_mvp D:\Projects\zvg_frontend_mvp_backup_stage16
```

2. Распакуй архив `zvg_stage16_duplicates_update_files.zip`.

3. Скопируй поверх проекта папки:

```txt
app
components
```

в:

```txt
D:\Projects\zvg_frontend_mvp
```

4. Проверь сборку:

```powershell
cd D:\Projects\zvg_frontend_mvp
npm run build
```

5. Запусти локально:

```powershell
npm run dev
```

6. Открой:

```txt
http://localhost:3000/admin/duplicates
```

7. Отправь на GitHub:

```powershell
git add .
git commit -m "Add duplicate merge admin tool"
git push
```

## База данных

`npm run db:push` не нужен. Схема базы не меняется.
