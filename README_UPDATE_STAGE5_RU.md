# Stage 5 — пользователи, избранное и сохранённые поиски

Этот пакет добавляет первый полноценный пользовательский функционал:

- регистрация пользователя;
- вход / выход;
- личный кабинет `/cabinet`;
- добавление объектов в избранное;
- удаление объектов из избранного;
- сохранение текущего поиска с фильтрами;
- список сохранённых поисков в кабинете;
- удаление сохранённых поисков;
- Header теперь показывает “Кабинет / Выйти” после входа.

Парсеры, AI-анализ и полноценная платёжная/подписочная система не добавляются.

---

## Важно

Этот этап меняет базу данных. Добавляются таблицы:

```txt
User
Favorite
SavedSearch
```

Поэтому после копирования файлов нужно выполнить:

```powershell
npm run db:push
```

---

## Установка

### 1. Сделать backup

```powershell
Copy-Item -Recurse D:\Projects\zvg_frontend_mvp D:\Projects\zvg_frontend_mvp_backup_stage5
```

### 2. Распаковать архив

Распакуй `zvg_stage5_user_features_update_files.zip`.

### 3. Скопировать файлы поверх проекта

Скопируй из архива:

```txt
app
components
lib
prisma
.env.example
```

в:

```txt
D:\Projects\zvg_frontend_mvp
```

Windows спросит заменить файлы — нажимай “Да”.

---

## 4. Добавить переменную в `.env`

В локальный файл `.env` добавь:

```env
USER_SESSION_SECRET="dev-user-session-secret-change-me-long-random"
```

Лучше сгенерировать длинную строку:

```powershell
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

И вставить результат:

```env
USER_SESSION_SECRET="сюда_результат_команды"
```

---

## 5. Обновить базу данных

Так как у тебя база Aiven уже подключена через `DATABASE_URL`, выполни:

```powershell
npm run db:push
```

Эта команда не должна удалять объекты. Она добавит новые таблицы для пользователей и избранного.

Не запускай `npm run db:seed`, если не хочешь заново перезаписать тестовые объекты.

---

## 6. Проверить сборку

```powershell
npm run build
```

---

## 7. Проверить локально

```powershell
npm run dev
```

Открой:

```txt
http://localhost:3000
```

Проверь:

```txt
/register — регистрация
/login — вход
/cabinet — кабинет
кнопка ♡ на карточке объекта
кнопка “Сохранить поиск” над списком объектов
```

---

## 8. Отправить на GitHub

```powershell
git add .
git commit -m "Add user accounts favorites and saved searches"
git push
```

---

## 9. Добавить переменную в Vercel

В Vercel открой:

```txt
Project → Settings → Environment Variables
```

Добавь:

```txt
USER_SESSION_SECRET
```

Значение — длинная случайная строка, например сгенерированная командой:

```powershell
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

После этого сделай Redeploy.

---

## Примечание по безопасности

Это уже нормальная базовая авторизация с хранением паролей не в открытом виде, а через PBKDF2-хэш. Для большого публичного проекта позже лучше перейти на Auth.js/NextAuth, Google login и email verification.
