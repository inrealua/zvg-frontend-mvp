# ZVG-DE Site AI v3.0.4 — принудительно DE / RU / EN

Публичные языки сайта: только German (DE), Russian (RU), English (EN).

- LanguageSwitcher показывает только Deutsch / Русский / English.
- старый cookie `zvg_locale=uk` или `ua` автоматически меняется на `en`;
- старые URL `/uk/...` и `/ua/...` перенаправляются 308 на `/en/...`;
- Prisma legacy enum UK не используется как публичный язык;
- `node scripts/check_public_locales.cjs` проверяет исходники на публичные украинские locale references.
