# Stage 6 — импорт JSON/CSV напрямую в базу данных

Этот пакет добавляет первую версию импорта объектов через админку.

## Что добавлено

- `/admin/import` — форма импорта JSON/CSV.
- `/admin/import/logs` — журнал импортов.
- `ImportLog` в Prisma-схеме.
- Обновление существующих объектов по связке `normalizedAktenzeichen + court`.
- Создание новых объектов, если такого дела ещё нет.
- Опциональный импорт фото и документов через поля `imageUrls` и `documentUrls`.

Парсеры и AI-анализ всё ещё не подключаются.

## Как поставить

### 1. Backup

```powershell
Copy-Item -Recurse D:\Projects\zvg_frontend_mvp D:\Projects\zvg_frontend_mvp_backup_stage6
```

### 2. Распакуй архив

Распакуй `zvg_stage6_import_update_files.zip`.

### 3. Скопируй файлы поверх проекта

Скопируй из архива папки:

```txt
app
components
lib
prisma
```

в:

```txt
D:\Projects\zvg_frontend_mvp
```

Windows спросит заменить файлы — нажимай **Да**.

### 4. Обнови базу данных

Так как добавляется таблица `ImportLog`, нужно выполнить:

```powershell
npm run db:push
```

Не запускай `npm run db:seed`, если не хочешь перезаполнить тестовые объекты.

### 5. Проверь сборку

```powershell
npm run build
```

### 6. Проверь локально

```powershell
npm run dev
```

Открой:

```txt
http://localhost:3000/admin/import
```

Если админка защищена паролем, сначала войди через:

```txt
http://localhost:3000/admin/login
```

### 7. Отправь на GitHub

```powershell
git add .
git commit -m "Add admin JSON CSV import"
git push
```

После `git push` Vercel сам начнёт деплой.

## Формат JSON

Минимальный пример:

```json
[
  {
    "aktenzeichen": "0099 K 0001/2026",
    "court": "Amtsgericht Chemnitz",
    "state": "Sachsen",
    "city": "Chemnitz",
    "postalCode": "09111",
    "street": "Teststraße",
    "houseNumber": "1",
    "title": "Testobjekt Import Einfamilienhaus",
    "propertyType": "Einfamilienhaus",
    "propertyTypeGroup": "WOHNHAEUSER",
    "status": "ACTIVE",
    "auctionDate": "2026-07-15",
    "marketValue": 99000,
    "description": "Testimport aus JSON"
  }
]
```

## Формат CSV

Первая строка — заголовки. Разделитель может быть `;` или `,`.

```csv
aktenzeichen;court;state;city;postalCode;street;houseNumber;title;propertyType;propertyTypeGroup;status;auctionDate;marketValue;description
0099 K 0002/2026;Amtsgericht Dresden;Sachsen;Dresden;01067;Importstraße;2;CSV Testobjekt;Eigentumswohnung;WOHNUNGEN;ACTIVE;2026-08-20;75000;Testimport aus CSV
```

## Важно

Импорт ищет существующий объект по:

```txt
normalizedAktenzeichen + court
```

Если объект найден — обновляет его. Если нет — создаёт новый.

Если в импортируемых данных есть `imageUrls`, старые фото этого объекта заменяются на новые.
Если есть `documentUrls`, старые документы этого объекта заменяются на новые.
