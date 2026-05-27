# ZVG Frontend MVP

Это стартовый MVP-проект для сайта судебных торгов Германии.

На этом этапе есть:

1. Next.js frontend.
2. Подключение к MySQL через Prisma.
3. Главная страница со списком объектов.
4. Фильтры по земле, городу, суду, типу, статусу, цене, площади, Denkmalschutz и Wertgrenzen.
5. Страница одного объекта.
6. MVP-карта с маркерами по координатам.
7. Seed-скрипт, который добавляет 50 придуманных объектов для тестирования.

На этом этапе пока нет:

1. Парсеров.
2. AI-анализа.
3. Авторизации.
4. Личного кабинета.
5. Админ-панели.
6. Настоящего импорта файлов.

Импорт в будущем можно делать напрямую в таблицы базы данных или через отдельный importer-скрипт.

---

# 1. Что нужно установить на компьютер

## 1.1. Node.js

Установи Node.js LTS с официального сайта.

После установки открой PowerShell и проверь:

```powershell
node -v
npm -v
```

Желательно, чтобы Node.js был версии 20 или выше.

## 1.2. VS Code

Установи Visual Studio Code.

## 1.3. Git

Установи Git.

Проверь:

```powershell
git --version
```

---

# 2. Подготовка базы данных MySQL

Нужна MySQL-база, доступная для Vercel.

Можно использовать:

1. Railway MySQL.
2. Aiven MySQL.
3. PlanetScale.
4. VPS с MySQL.
5. Любой другой внешний MySQL.

Главное — получить строку подключения вида:

```txt
mysql://USER:PASSWORD@HOST:PORT/DATABASE
```

Пример:

```txt
mysql://root:mypassword@myhost.railway.app:3306/railway
```

Эта строка будет называться:

```txt
DATABASE_URL
```

---

# 3. Как запустить проект локально

## Шаг 1. Распаковать архив

Распакуй архив `zvg_frontend_mvp.zip` в удобную папку, например:

```txt
D:\Projects\zvg_frontend_mvp
```

## Шаг 2. Открыть папку в VS Code

Открой VS Code → File → Open Folder → выбери папку проекта.

## Шаг 3. Открыть терминал

В VS Code открой:

```txt
Terminal → New Terminal
```

## Шаг 4. Установить зависимости

Выполни:

```powershell
npm install
```

## Шаг 5. Создать файл .env

В корне проекта создай файл:

```txt
.env
```

Можно скопировать `.env.example` и переименовать в `.env`.

Вставь туда свою строку подключения:

```env
DATABASE_URL="mysql://USER:PASSWORD@HOST:PORT/DATABASE"
```

Важно: пароль и спецсимволы в URL должны быть корректно закодированы. Если в пароле есть `@`, `#`, `%`, пробелы — лучше поменять пароль на простой для теста.

## Шаг 6. Сгенерировать Prisma Client

```powershell
npm run db:generate
```

## Шаг 7. Создать таблицы в базе

```powershell
npm run db:push
```

Эта команда создаст таблицы по файлу:

```txt
prisma/schema.prisma
```

## Шаг 8. Закинуть 50 тестовых объектов

```powershell
npm run db:seed
```

После этого в базе появятся:

1. 50 объектов.
2. По 3 фото на объект.
3. По 2 тестовых документа на объект.

## Шаг 9. Запустить сайт локально

```powershell
npm run dev
```

Открой в браузере:

```txt
http://localhost:3000
```

---

# 4. Проверка фильтров

На главной странице проверь:

1. Bundesland — например Sachsen, Thüringen, Berlin.
2. Город — Chemnitz, Dresden, Leipzig, Erfurt и т.д.
3. Суд — Amtsgericht Chemnitz, Amtsgericht Dresden и т.д.
4. Тип объекта — жилые дома, квартиры, коммерция, участки.
5. Статус — активные и отменённые.
6. Цена от/до.
7. Жилая площадь от.
8. Denkmalschutz.
9. Wertgrenzen weggefallen.

Кнопка `Очистить` сбрасывает фильтры.

---

# 5. Проверка build перед деплоем

Перед отправкой на GitHub обязательно запусти:

```powershell
npm run build
```

Если build прошёл без ошибок — можно деплоить.

---

# 6. Как отправить проект на GitHub

## Шаг 1. Создать репозиторий на GitHub

На GitHub создай новый репозиторий, например:

```txt
zvg-frontend-mvp
```

## Шаг 2. В терминале проекта выполнить

```powershell
git init
git add .
git commit -m "Initial ZVG frontend MVP"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/zvg-frontend-mvp.git
git push -u origin main
```

Замени `YOUR_USERNAME` на свой GitHub username.

Если Git попросит логин — авторизуйся через браузер или GitHub token.

---

# 7. Деплой на Vercel

## Шаг 1. Создать проект на Vercel

1. Открой Vercel.
2. Нажми `Add New Project`.
3. Выбери GitHub-репозиторий.
4. Framework должен определиться как Next.js.

## Шаг 2. Добавить переменную окружения

В настройках проекта Vercel добавь Environment Variable:

```txt
DATABASE_URL
```

Значение:

```txt
mysql://USER:PASSWORD@HOST:PORT/DATABASE
```

Добавь для всех окружений:

```txt
Production
Preview
Development
```

## Шаг 3. Deploy

Нажми Deploy.

Если база пустая, сайт откроется, но объектов не будет.

---

# 8. Как закинуть 50 объектов в production-базу

Самый простой вариант для новичка:

## Вариант A — локально через .env с production DATABASE_URL

1. В локальном `.env` поставь ту же `DATABASE_URL`, что и на Vercel.
2. Выполни:

```powershell
npm run db:push
npm run db:seed
```

После этого 50 объектов появятся в production-базе.

Важно: `db:seed` удаляет старые тестовые объекты и создаёт новые 50. Для реальных данных потом нужно будет изменить seed/import-логику.

## Вариант B — через Vercel CLI

Установить Vercel CLI:

```powershell
npm i -g vercel
```

Подтянуть переменные:

```powershell
vercel env pull .env
```

Потом:

```powershell
npm run db:push
npm run db:seed
```

---

# 9. Как вносить изменения после деплоя

Обычный порядок:

```powershell
npm run build
git add .
git commit -m "Describe change"
git push
```

После `git push` Vercel автоматически начнёт новый деплой.

---

# 10. Что делать, если ошибка DATABASE_URL

Если видишь ошибку Prisma про DATABASE_URL:

1. Проверь, что файл `.env` существует локально.
2. Проверь, что в Vercel добавлен `DATABASE_URL`.
3. Проверь, что MySQL доступен извне.
4. Проверь, что пароль в строке подключения не содержит неэкранированные спецсимволы.

---

# 11. Что делать, если таблиц нет

Выполни:

```powershell
npm run db:push
```

Потом:

```powershell
npm run db:seed
```

---

# 12. Что делать, если build падает

Сначала локально:

```powershell
npm run build
```

Если ошибка TypeScript — исправить файл, затем снова:

```powershell
npm run build
```

Только после успешного build отправлять на GitHub:

```powershell
git add .
git commit -m "Fix build"
git push
```

---

# 13. Следующие этапы после MVP

## Этап 2

1. Нормальная карта Leaflet/OpenStreetMap.
2. Polygon search.
3. Радиус от города или PLZ.
4. Избранное.
5. Сохранённые поиски.

## Этап 3

1. Авторизация.
2. Личный кабинет.
3. Admin-панель.
4. Редактирование объектов.
5. Загрузка фото.

## Этап 4

1. Импорт CSV/JSON напрямую в базу.
2. Связь с внешним парсером.
3. Дедупликация по Aktenzeichen + Gericht + Adresse.

## Этап 5

1. AI-анализ.
2. Юридические риски.
3. Строительные риски.
4. Оценка рынка.
