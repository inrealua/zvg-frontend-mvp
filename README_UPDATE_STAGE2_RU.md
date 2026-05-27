# Stage 2 — настоящая карта OpenStreetMap / Leaflet

Этот пакет заменяет MVP-карту-заглушку на настоящую карту OpenStreetMap/Leaflet.

## Что меняется

- На главной странице появляется настоящая интерактивная карта.
- Объекты отображаются маркерами по координатам из базы.
- Цвет маркера зависит от типа объекта.
- Отменённые торги отображаются красным маркером.
- При клике на маркер открывается popup с фото, городом, типом, ценой, датой торгов и ссылкой на объект.
- На странице объекта появляется настоящая мини-карта.
- Колесо мыши на карте отключено, чтобы при прокрутке страницы карта не дёргалась.
- База данных не меняется.
- Prisma schema не меняется.

## Какие файлы заменить/добавить

Скопируй из архива в проект папки:

```txt
app
components
lib
```

Новые/изменённые файлы:

```txt
app/layout.tsx
app/page.tsx
app/globals.css
app/properties/[id]/page.tsx
components/PropertyMap.tsx
components/PropertyDetailMap.tsx
lib/leaflet-loader.ts
```

## Порядок установки

### 1. Сделай backup

```powershell
Copy-Item -Recurse D:\Projects\zvg_frontend_mvp D:\Projects\zvg_frontend_mvp_backup_stage2
```

### 2. Распакуй архив

Распакуй `zvg_stage2_map_update_files.zip`.

### 3. Скопируй файлы поверх проекта

Скопируй папки:

```txt
app
components
lib
```

в:

```txt
D:\Projects\zvg_frontend_mvp
```

На вопрос Windows о замене файлов нажми “Да”.

### 4. Проверь локальный build

```powershell
cd D:\Projects\zvg_frontend_mvp
npm run build
```

### 5. Проверь локально

```powershell
npm run dev
```

Открой:

```txt
http://localhost:3000
```

Проверь:

- карта на главной странице загрузилась;
- маркеры видны;
- popup открывается при клике на маркер;
- ссылка “Подробнее” ведёт на страницу объекта;
- на странице объекта видна карта объекта.

### 6. Отправь на GitHub

```powershell
git add .
git commit -m "Add OpenStreetMap property map"
git push
```

После `git push` Vercel сам запустит деплой.

## Важно

Карта подключает Leaflet через CDN:

```txt
https://unpkg.com/leaflet@1.9.4
```

Поэтому package.json не меняется и новые npm-пакеты устанавливать не нужно.

## Если карта не видна

1. Проверь, есть ли у объектов координаты `latitude` и `longitude`.
2. Проверь в браузере, не блокирует ли интернет или adblock `unpkg.com`.
3. Открой DevTools → Console и посмотри ошибку.

Если после деплоя карта не появилась, пришли мне лог из браузера Console или скриншот.
