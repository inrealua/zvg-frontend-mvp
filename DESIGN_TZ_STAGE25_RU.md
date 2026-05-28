# Stage 25 — внедрение визуального дизайна ZVG DE

## Цель
Внедрить спокойный, доверительный и профессиональный дизайн для сайта zvg-de.com на основе выбранного визуального направления: светлая палитра, muted green, тёплый белый фон, чёткие карточки, аккуратный header и более премиальная типографика.

## Концепция бренда
- Название в интерфейсе: **ZVG DE**
- Домен: **zvg-de.com**
- Подпись: **Immobilienauktionen** / **Immobilienauktionen in Deutschland**
- Позиционирование: прозрачный и понятный поиск объектов судебных торгов Германии.

## Цветовая палитра
- Primary green: `#2f5e4e`
- Primary dark: `#244c3e`
- Soft green: `#e8f1ec`
- Background: `#f4f6f5`
- Warm surface: `#fbfaf7`
- Card: `#ffffff`
- Text: `#17202a`
- Muted text: `#64748b`
- Border: `#dfe6e1`
- Accent gold: `#c9942e`

## Типографика
- Основной интерфейс: system / Inter-like sans-serif.
- Hero и заголовки карточек: Georgia fallback для более премиального, спокойного ощущения.
- Основной принцип: большая иерархия, меньше визуального шума, много воздуха.

## Что меняет пакет
1. Header:
   - Новый бренд **ZVG DE**.
   - Новый символ дома.
   - Чистая навигация.
   - Admin-ссылки собраны в выпадающий блок, чтобы не перегружать верхнее меню.

2. Главный экран:
   - Новый hero в стиле профессионального Immobilien-портала.
   - Тёплый фон и архитектурное изображение справа.
   - Доверительные пункты: Geprüfte Quellen, Täglich aktualisiert, Deutschlandweit.

3. Фильтры:
   - Более чистый блок фильтров.
   - Немецкие основные подписи.
   - Уменьшение визуального шума.
   - Кнопка CTA: **Immobilien finden**.

4. Карточки объектов:
   - Более аккуратные, светлые карточки.
   - Спокойные теги.
   - Акцент на Verkehrswert, адрес и дату торгов.

5. Footer:
   - Новый брендинг ZVG DE.
   - Немецкие ссылки.

## Файлы в пакете
- `app/globals.css`
- `app/layout.tsx`
- `components/Header.tsx`
- `components/Footer.tsx`
- `components/PublicPropertiesPage.tsx`
- `components/FilterBar.tsx`
- `components/PropertyCard.tsx`
- `design_reference_zvg_de.png`

## Важно
Пакет меняет только визуал и тексты интерфейса. Схема базы данных не меняется. `npm run db:push` не нужен.

## Порядок установки
1. Сделать backup проекта.
2. Скопировать `app` и `components` поверх текущего проекта.
3. Проверить локально: `npm run build`, затем `npm run dev`.
4. Отправить на GitHub: `git add .`, `git commit -m "Apply ZVG DE visual redesign"`, `git push`.
