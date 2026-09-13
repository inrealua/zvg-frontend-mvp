# Site hotfix v3.0.4 — DE/RU/EN only

Публичные языки сайта: только DE / RU / EN.

Что делает патч:
- старые cookie `zvg_locale=uk` или `ua` автоматически переводятся на `en`;
- старые URL `/uk/...` и `/ua/...` перенаправляются на `/en/...` с сохранением пути и query;
- переключатель языка содержит только Deutsch / Русский / English;
- база данных и карточки не удаляются этим патчем.

После копирования поверх проекта:

```cmd
cd /d F:\ZVG-SITE-GIT
rmdir /s /q .next
npm run build
git add .
git commit -m "Retire legacy Ukrainian locale and keep DE RU EN"
git push
```

После production deploy открой `/en` и сделай Ctrl+F5. Старые `/uk/...` должны автоматически перейти на `/en/...`.
