# Stage 48D — more translation cleanup

Исправляет места, которые остались непереведёнными:

- блок рисования полигона:
  - `Klicken Sie...`
  - `Polygon anwenden`
  - `Punkte löschen`
  - `Abbrechen`
- карточка объекта в кабинете:
  - `Meine Notiz`
  - `Ihre persönliche Notiz...`
  - `Speichern`
  - `Entfernen`
- страница объекта:
  - `Nutzfläche`
  - `Gesamtfläche`
  - `Aktenzeichen`
- карта:
  - `Karte der Objekte`
  - `In diesem Kartenausschnitt suchen`
  - `Region zeichnen`
- убирает дубль на карточке:
  - было: `Жилые дома · Жилой дом`
  - стало: `Жилые дома`

## Установка

1. Backup:

```powershell
Copy-Item -Recurse D:\Projects\zvg_frontend_mvp D:\Projects\zvg_frontend_mvp_backup_stage48d
```

2. Скопировать из архива папки:

```txt
components
scripts
```

в проект:

```txt
D:\Projects\zvg_frontend_mvp
```

3. Запустить patch для карточки объекта:

```powershell
cd D:\Projects\zvg_frontend_mvp
node .\scripts\stage48d_patch_propertycard_kicker.mjs
```

4. Проверить:

```powershell
npm run build
npm run dev
```

5. Если build прошёл:

```powershell
git add .
git commit -m "Clean up remaining translations"
git push
```

## Важно

Этот пакет заменяет `components/LanguageRuntimeFix.tsx` расширенной версией. Если Stage 48C уже был установлен, просто заменить файл.
