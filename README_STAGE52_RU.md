# Stage 52 — filter design and performance reset

## Что исправляет

1. Убирает ужасные зелёные стрелки сбоку каждого поля.
2. Оставляет только нормальные кнопки:
   - сверху: `Показать результаты` + `Сбросить`
   - снизу: `Показать результаты` + `Сбросить фильтр`
3. Отключает зависания от предыдущего `LanguageRuntimeFix`:
   - убирает `setInterval(run, 150/250)`
   - оставляет нормальную работу через observer/смену DOM
4. Чинит внешний вид ползунков отдельными clean CSS-классами.
5. Сохраняет:
   - радиус 0–1000 км
   - ручное применение фильтра по кнопке
   - очистку полей при сбросе/удалении активных фильтров

## Установка

### 1. Backup

```powershell
Copy-Item -Recurse D:\Projects\zvg_frontend_mvp D:\Projects\zvg_frontend_mvp_backup_stage52
```

### 2. Скопировать из архива

```txt
components
scripts
```

в проект:

```txt
D:\Projects\zvg_frontend_mvp
```

с заменой `components/FilterBar.tsx`.

### 3. Запустить patch

```powershell
cd D:\Projects\zvg_frontend_mvp
node .\scripts\stage52_patch_filter_design_performance.mjs
```

### 4. Проверить

```powershell
npm run build
npm run dev
```

### 5. Commit

```powershell
git add .
git commit -m "Reset filter design and improve performance"
git push
```

## Важно

Если после этого сайт всё ещё зависает, почти наверняка причина уже не в фильтре, а в `LanguageRuntimeFix.tsx` или карте. Тогда временно отключим runtime-переводчик из `app/layout.tsx` и перейдём на нормальные словари вместо DOM-перевода.
