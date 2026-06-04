# Stage 47E hotfix — fix build errors

Этот hotfix исправляет ошибки после автоматического patch Stage 47E:

- `{isLoading ? "..." : {ui.common.remove}}`
- `{isPending ? "..." : {ui.common.save}}`
- `title: {ui.hero.title}`
- дубли `locale`
- дубли `ui`
- случайно добавленные server i18n вызовы в client components

## Установка

1. Скопируйте папку `scripts` в проект:

```txt
D:\Projects\zvg_frontend_mvp
```

2. Запустите:

```powershell
node .\scripts\stage47e_hotfix_build_errors.mjs
```

3. Проверьте:

```powershell
npm run build
```

Если build пройдёт:

```powershell
git add .
git commit -m "Fix Stage 47E build errors"
git push
```

Если после этого будет ещё ошибка, пришлите новый build log.
