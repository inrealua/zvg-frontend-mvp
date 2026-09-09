# ZVG-DE Site AI v3.0.4 — полное удаление украинского языка

Публичные языки сайта после патча: DE / RU / EN.

Что делает патч:
- LanguageSwitcher содержит только Deutsch / Русский / English;
- `/uk` и `/ua` перенаправляются на соответствующий `/en` URL;
- удаляются legacy строки `PropertyTranslation.locale=UK` отдельной безопасной командой;
- после удаления UK из данных Prisma enum становится только DE/RU/EN;
- doctor показывает количество legacy UK переводов.

Порядок:
1. Распаковать ZIP поверх проекта.
2. `npm run locale:purge-uk` — только dry-run.
3. `npm run locale:purge-uk -- --execute --confirm REMOVE_UK`
4. `npm run db:push`
5. `rmdir /s /q .next`
6. `npm run build`
7. `npm run site:v3:doctor`

Ожидается:
- `Legacy UK translations: 0`
- `Public locales: DE / RU / EN only`
- `DB schema: READY`
