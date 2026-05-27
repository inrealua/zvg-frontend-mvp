# Stage 6 — файлы для замены / добавления

Скопировать поверх проекта:

```txt
app/admin/page.tsx
app/admin/import/page.tsx
app/admin/import/logs/page.tsx
app/globals.css
components/Header.tsx
lib/import-utils.ts
prisma/schema.prisma
```

После копирования обязательно выполнить:

```powershell
npm run db:push
npm run build
```
