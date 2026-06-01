# Stage 37 — Favoriten-Notizen, Suchnamen und Auktionskalender

Dieser Schritt erweitert den Benutzerbereich. Die Authentifizierung wird nicht geändert.

## Was neu ist

- Persönliche Notizen zu Favoriten.
- Bearbeitbare Namen für gespeicherte Suchen.
- Automatische Namensgenerierung beim Speichern einer Suche, z. B. `Berlin +100 km bis 100.000 €`.
- Auktionskalender im Cabinet für favorisierte Objekte.
- Bei mehreren Auktionen an einem Tag zeigt der Kalender eine Tagesliste.

## Dateien

- `prisma/schema.prisma`
- `app/cabinet/page.tsx`
- `app/api/favorites/[propertyId]/route.ts`
- `app/api/saved-searches/route.ts`
- `app/api/saved-searches/[id]/route.ts`
- `components/FavoriteNoteForm.tsx`
- `components/SavedSearchNameForm.tsx`
- `components/AuctionCalendar.tsx`
- `STAGE37_CSS_APPEND.css`

## Wichtig

`app/globals.css` wird nicht automatisch ersetzt. Bitte den Inhalt aus `STAGE37_CSS_APPEND.css` ganz unten in `app/globals.css` einfügen.

## Installation

```powershell
Copy-Item -Recurse D:\Projects\zvg_frontend_mvp D:\Projects\zvg_frontend_mvp_backup_stage37
```

Dann aus dem Archiv kopieren:

```txt
app
components
prisma
```

nach:

```txt
D:\Projects\zvg_frontend_mvp
```

Danach den Inhalt von `STAGE37_CSS_APPEND.css` an das Ende von `app/globals.css` anhängen.

## Datenbank aktualisieren

Da `Favorite.note` und `Favorite.updatedAt` hinzugefügt werden:

```powershell
npm run db:push
```

## Build prüfen

```powershell
npm run build
npm run dev
```

## Deployment

```powershell
git add .
git commit -m "Add favorite notes saved search names and auction calendar"
git push
```

## Prüfung

1. Einloggen.
2. Favorit hinzufügen.
3. Cabinet öffnen.
4. Notiz zum Favoriten speichern.
5. Suche speichern.
6. Suchnamen im Cabinet ändern.
7. Auktionskalender prüfen.
