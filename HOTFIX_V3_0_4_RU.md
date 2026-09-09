# Site AI v3.0.4 — EN-only language cleanup

Цель: публичные языки сайта строго DE / RU / EN. Украинский язык и legacy locale UK больше не используются.

Что делает hotfix:
- удаляет `UK` из Prisma enum после безопасной очистки старых UK-переводов;
- добавляет `npm run locale:cleanup-uk` — сначала делает JSON-backup всех legacy UK-строк, затем удаляет только эти строки;
- старые URL `/uk/...` и `/ua/...` автоматически перенаправляются на `/en/...`;
- старые cookie `zvg_locale=uk` / `ua` трактуются как English;
- переключатель языка остаётся только Deutsch / Русский / English;
- doctor показывает количество legacy UK translation rows.

## Порядок установки

1. Распаковать архив поверх `F:\ZVG-SITE-GIT`.
2. Выполнить:

```cmd
cd /d F:\ZVG-SITE-GIT
npm run locale:cleanup-uk
npm run db:push
npm run site:v3:doctor
rmdir /s /q .next
npm run build
```

Ожидается:

```text
Legacy UK translations found: N
[OK] Backup written: ...\backups\legacy-uk-translations-....json
[OK] Deleted legacy UK translations: N
[OK] Verification passed: 0 UK rows remain.
```

После `db:push` Prisma enum снова содержит только `DE`, `RU`, `EN`.

Не удаляет Property, User, SavedSearch или другие данные. Удаляются только строки `PropertyTranslation` с locale `UK`, которые пользователю не нужны.
