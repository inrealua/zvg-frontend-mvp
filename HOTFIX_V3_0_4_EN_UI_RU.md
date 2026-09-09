# Site AI v3.0.4 — English language UI hotfix

Цель: публичный переключатель языков строго **Deutsch / Русский / English**.

Этот hotfix НЕ меняет Prisma schema и НЕ удаляет данные из БД.

Что исправляет:
- в переключателе доступны только `DE / RU / EN`;
- название третьего языка жестко фиксируется как `English`, даже если где-то остался старый label `Українська`;
- публичный список локалей — только `de`, `ru`, `en`;
- старые cookie `uk` / `ua` трактуются как `en`;
- старые URL `/uk/...` и `/ua/...` перенаправляются на `/en/...`;
- словари меню содержат только Deutsch / Русский / English.

## Установка

Распаковать ZIP поверх:

`F:\ZVG-SITE-GIT`

Затем:

```cmd
cd /d F:\ZVG-SITE-GIT
rmdir /s /q .next
npm run build
git add components/LanguageSwitcher.tsx lib/i18n/config.ts lib/i18n/dictionaries.ts proxy.ts HOTFIX_V3_0_4_EN_UI_RU.md
git commit -m "Fix language switcher to DE RU EN"
git push
```

После Vercel Preview проверить, что меню показывает:

- Deutsch
- Русский
- English

и `/en` открывается нормально.

Legacy `UK` в Prisma enum пока можно оставить как внутреннюю совместимость со старыми тестовыми строками. Удалим его безопасно позже, после очистки старого каталога.
