# Site AI v3.0.4 — DE/RU/EN language switcher hardening

Причина патча: публичный dropdown на развернутом сайте показывает «Українська», хотя целевой набор языков — DE/RU/EN.

Патч намеренно делает меню языков независимым от legacy DB enum и любых старых label-объектов:
- DE = Deutsch
- RU = Русский
- EN = English
- публичного UK/uk в переключателе нет.

Файл Prisma не меняется. Legacy enum `UK` в БД пока остается только для старых строк до очистки каталога и не является публичным языком.

## Установка
Распаковать ZIP прямо в корень проекта `F:\ZVG-SITE-GIT` с заменой файлов.

Проверить:

```cmd
cd /d F:\ZVG-SITE-GIT
node scripts\i18n_locale_doctor.cjs
rmdir /s /q .next
npm run build
```

Ожидается:

```text
I18N LOCALE DOCTOR: OK
Public languages: DE / RU / EN
Language menu: Deutsch / Русский / English
```

После успешного build закоммитить и отправить в ту же feature-ветку, затем дождаться нового Vercel Preview/Production deployment.
