# Stage 47F hotfix — remove all ui.* from PublicPropertiesPage

Исправляет ошибки вида:

```txt
Cannot find name 'ui'
components/PublicPropertiesPage.tsx
```

Например:

```tsx
{ui.hero.checkedSources}
{ui.hero.dailyUpdated}
{ui.hero.nationwide}
```

## Установка

```powershell
cd D:\Projects\zvg_frontend_mvp
node .\scripts\stage47f_hotfix_publicproperties_all_ui.mjs
npm run build
```

Если build пройдёт:

```powershell
git add .
git commit -m "Remove broken ui references from PublicPropertiesPage"
git push
```

После восстановления сборки лучше заменить `PublicPropertiesPage.tsx` целиком нормальной мультиязычной версией.
