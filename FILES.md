# Список файлов проекта

```txt
zvg_frontend_mvp/
├─ app/
│  ├─ globals.css
│  ├─ layout.tsx
│  ├─ page.tsx
│  └─ properties/
│     └─ [id]/
│        └─ page.tsx
├─ components/
│  ├─ FilterBar.tsx
│  ├─ PropertyCard.tsx
│  └─ PropertyMap.tsx
├─ lib/
│  ├─ filter-options.ts
│  ├─ format.ts
│  └─ prisma.ts
├─ prisma/
│  ├─ schema.prisma
│  └─ seed.ts
├─ public/
├─ .env.example
├─ .gitignore
├─ FILES.md
├─ next-env.d.ts
├─ next.config.ts
├─ package.json
├─ README_RU.md
└─ tsconfig.json
```

## Что делает каждый блок

- `app/page.tsx` — главная страница: берет объекты из базы MySQL через Prisma, применяет фильтры и показывает карточки.
- `app/properties/[id]/page.tsx` — страница одного объекта.
- `components/FilterBar.tsx` — форма фильтров, меняет URL-параметры.
- `components/PropertyCard.tsx` — карточка объекта в списке.
- `components/PropertyMap.tsx` — MVP-карта без внешних библиотек, показывает маркеры по координатам.
- `lib/prisma.ts` — единый Prisma Client.
- `lib/format.ts` — форматирование цены, площади, дат и перевод статусов.
- `lib/filter-options.ts` — списки значений для фильтров.
- `prisma/schema.prisma` — структура базы данных.
- `prisma/seed.ts` — добавляет 50 тестовых объектов, фото и документы.
- `.env.example` — пример переменной `DATABASE_URL`.
