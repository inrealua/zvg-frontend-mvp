# Stage 5 — файлы для замены/добавления

Скопируй эти папки и файлы поверх текущего проекта:

```txt
app/
components/
lib/
prisma/schema.prisma
.env.example
```

Новые/обновлённые файлы:

```txt
app/login/page.tsx
app/register/page.tsx
app/logout/route.ts
app/cabinet/page.tsx
app/api/auth/login/route.ts
app/api/auth/register/route.ts
app/api/favorites/[propertyId]/route.ts
app/api/saved-searches/route.ts
app/api/saved-searches/[id]/route.ts
app/page.tsx
app/properties/[id]/page.tsx
app/globals.css
components/Header.tsx
components/PropertyCard.tsx
components/FavoriteButton.tsx
components/SaveSearchButton.tsx
components/DeleteFavoriteButton.tsx
components/DeleteSavedSearchButton.tsx
lib/user-auth.ts
prisma/schema.prisma
.env.example
```
