# ZVG-DE Site AI v3.0 — установка через GitHub

Этот патч рассчитан на актуальный GitHub-проект `zvg-frontend-mvp` с рабочими языками DE/RU/EN.
Он НЕ переводит сайт на украинский и не меняет существующую языковую концепцию.

## Что добавляет
- Quality v3 importer для `ZVG_FROM_CHATGPT.zip` после `receive`.
- DE/RU/EN расширенные описания и `localizedFields`.
- primarySource и оригинальные документы.
- независимую рыночную оценку отдельно от официального Verkehrswert.
- риски, ремонт, bid strategy, evidence/enrichment/qualityGate.
- `/admin/analysis` со статусами REVIEW/READY/PUBLISHED/ARCHIVED.
- REVIEW не показывается в публичном каталоге, карте и sitemap.
- безопасную очистку старого каталога с обязательным backup.

## Рекомендуемая установка

Создать чистую GitHub-копию проекта:

```cmd
cd /d F:\
git clone https://github.com/inrealua/zvg-frontend-mvp.git ZVG-SITE-GIT
cd /d F:\ZVG-SITE-GIT
git checkout -b feature/ai-v3-site
```

Если папка уже существует:

```cmd
cd /d F:\ZVG-SITE-GIT
git checkout main
git pull origin main
git checkout -b feature/ai-v3-site
```

Распаковать содержимое `zvg-de-site-ai-v3.0-github-patch.zip` ПРЯМО в `F:\ZVG-SITE-GIT` с заменой файлов.

Скопировать только локальный `.env` из проверенной рабочей папки (он не должен попадать в Git):

```cmd
copy /Y F:\ZVG-SITE-AI-V2\.env F:\ZVG-SITE-GIT\.env
```

Проверка:

```cmd
npm install
npx prisma validate
npm run build
```

После успешного build применить только добавление/изменение колонок БД:

```cmd
npm run db:push
npm run site:v3:doctor
```

До очистки старого каталога doctor должен показывать старые объекты как PUBLISHED.

## GitHub → Vercel Preview

```cmd
git status
git add .
git commit -m "Add ZVG AI Quality v3 catalog"
git push -u origin feature/ai-v3-site
```

Проверить Vercel Preview, особенно:
- `/admin/analysis`
- `/de`
- `/ru`
- `/en`
- обычную карточку объекта
- вход/кабинет пользователя

После проверки merge `feature/ai-v3-site` → `main` через GitHub. Vercel Production должен деплоиться из `main`.

## Очистка старого каталога

Делать ТОЛЬКО после успешного Production deploy.

Сначала просмотр без удаления:

```cmd
npm run catalog:reset-ai-v3
```

Он показывает сколько будет удалено из Property и связанных таблиц.

Реальное удаление:

```cmd
npm run catalog:reset-ai-v3 -- --execute --confirm RESET_CATALOG
```

Перед удалением скрипт автоматически запускает `catalog:backup` и прекращает работу, если backup не создался.

Удаляются:
- Property
- PropertyImage (cascade)
- PropertyDocument (cascade)
- PropertyTranslation (cascade)
- Favorite (cascade, потому что старые избранные привязаны к старым Property)

Сохраняются и проверяются до/после:
- User
- Session
- SavedSearch
- PostalCode
- ImportLog

Старые файлы в Cloudflare R2 этим скриптом НЕ удаляются. Это сделано намеренно: очистку R2 лучше выполнить отдельно после того, как новый каталог стабильно заработает.

После очистки:

```cmd
npm run site:v3:doctor
```

Ожидается пустой каталог. После приёма первого Quality v3 пакета:

```cmd
npm run analysis:import -- --input "ПУТЬ_К_PENDING_IMPORT" --dry-run
npm run analysis:import -- --input "ПУТЬ_К_PENDING_IMPORT"
npm run site:v3:doctor
```

Новые объекты импортируются как REVIEW. Публиковать их можно из `/admin/analysis`.
