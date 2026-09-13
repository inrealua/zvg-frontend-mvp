# Site AI v3.0.2 — legacy Locale hotfix

Причина ошибки `Data truncated for column locale`: в production DB остались старые строки PropertyTranslation с locale=UK от раннего AI-теста. Новый schema v3.0 пытался сразу удалить значение UK из MySQL ENUM, поэтому ALTER TABLE прерывался до добавления новых translation columns.

Этот hotfix временно сохраняет `UK` в Prisma enum только как legacy database value. Публичный сайт и новый importer продолжают работать строго с DE/RU/EN.

После применения:

```cmd
npm run catalog:backup
npx prisma generate
npm run db:push
npm run site:v3:doctor
```

После окончательной очистки старого каталога UK-строк не останется. Сам enum можно удалить позднее отдельной безопасной schema-cleanup миграцией; держать неиспользуемое значение тоже безопасно.
