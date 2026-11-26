# Ідеї: як додавати й підтримувати контент

Ідеї живуть окремими файлами в `content/ideas/<slug>.json` — це **єдине джерело правди**. З них при збірці автоматично
генеруються дані застосунку й SEO-сторінки. Руками нічого в `src/assets/data/tasks*.json` не редагуйте (файли генеровані й у `.gitignore`).

```
content/
  config.json          ліміти, дозволені значення, дозволені домени посилань, розмір сторінки
  ideas/*.json         по файлу на ідею
scripts/
  content.mjs          CLI: check · build · new · todo · import
  content-lib.mjs      завантаження, валідація, генерація даних
  seo-pages.mjs        статичні сторінки для пошуку (викликається з `npm run build`)
src/assets/data/       ГЕНЕРУЄТЬСЯ: tasks.json (англ.) + tasks.<мова>.json (переклади)
```

## Додати ідею (5 хвилин)
```bash
npm run idea:new -- "Build a snow lantern" --location out --duration 30 --age family,kids_7_12
```
1. Відкрийте створений `content/ideas/build-a-snow-lantern.json` (`status: "draft"`), заповніть `text.en`.
2. Змініть `"status"` на `"published"`.
3. `npm run content:check` — має бути без помилок.
4. Переклади: `npm run content:todo -- --lang pl` створює `content/.todo/pl.json` з англійськими текстами → переклад (людина, Crowdin, LLM) →
   `npm run content:import -- --lang pl content/.todo/pl.json`. Повторіть для `ua es de fr`.
5. Закомітьте файл. CI перевірить, зберe застосунок і SEO-сторінки.

Нова ідея автоматично отримує: картку в колоді, місце в календарі, сторінки `/{мова}/ideas/{slug}/` для кожної мови, де є переклад,
hreflang, JSON-LD, запис у sitemap і блок «Більше ідей».

## Формат файлу
```jsonc
{
  "id": "task_025",              // не змінюйте після публікації: на нього посилаються дані користувачів
  "slug": "build-a-snow-lantern",// URL; ім'я файлу = <slug>.json; після публікації не змінюйте (SEO)
  "status": "published",         // draft — не потрапляє ні в застосунок, ні на сайт
  "addedAt": "2026-11-25",       // lastmod у sitemap
  "location": "out",             // in | out
  "duration": 30,                // 5 | 15 | 30 | 60
  "ageGroups": ["family"],       // kids_3_6 | kids_7_12 | adults | family
  "category": "activity",        // необов'язково: activity | heart_deed
  "image": "ideas/<slug>.jpg",   // необов'язково, файл у src/assets; без нього — запасна картинка за місцем
  "photo": { "id": "…", "author": "Ім'я автора", "url": "https://unsplash.com/photos/…" },  // кредит фото (Unsplash)
  "tags": ["craft"],             // необов'язково; для майбутніх підбірок
  "inspiration": { "url": "https://www.pinterest.com/…", "type": "pinterest" },  // необов'язково
  "text": {
    "en": { "title": "…", "shortDesc": "…", "fullDesc": "…" },   // обов'язково
    "ua": { … }, "pl": { … }, "es": { … }, "de": { … }, "fr": { … }
  }
}
```
Ліміти (див. `content/config.json`): `title` ≤ 60, `shortDesc` ≤ 90, `fullDesc` 30–700 символів; посилання лише `https` і лише з дозволених доменів.

## Що перевіряє `npm run content:check`
Унікальність `id`/`slug`, ім'я файлу, допустимі значення, довжини текстів, існування `image`, дозволені домени посилань,
повноту текстів у кожній мові. Відсутній переклад — **попередження** (додаток покаже англійську, а сторінка цією мовою
просто не створюється); з `--strict` або `CONTENT_STRICT=1` — помилка.

## Як це масштабується
- Дані застосунку розбиті за мовами: `tasks.json` (основа, англійська) + `tasks.<мова>.json`. Користувач вантажить лише свою мову,
  тож 500+ ідей не роздувають початкове завантаження; для нових мов достатньо додати код у `content/config.json`, `i18n/<мова>.ts` і `seo-pages.mjs`.
- SEO-сторінки: список ідей пагінується (24 на сторінку), sitemap розбитий по мовах + індекс (ліміт 50 000 URL на файл не загрожує).
- `draft` дає змогу готувати ідеї наперед; `addedAt` потрапляє в `lastmod`.

## Правила, щоб не зламати користувачів
- Ніколи не змінюйте й не перевикористовуйте `id` — збережені/заплановані ідеї посилаються на нього.
- Не видаляйте опубліковану ідею; ховайте через `"status": "draft"` (у користувачів вона просто зникне з колоди; календар покаже «ідея недоступна»).
- `slug` після публікації не змінюйте (інакше зламаються індексовані URL); якщо треба — додайте редирект на хостингу.

## Скрипти npm
| Команда | Що робить |
|---|---|
| `npm run idea:new -- "Title" [--location] [--duration] [--age] [--image]` | створює чернетку з наступним `id` |
| `npm run content:check` | валідація (також у CI) |
| `npm run content:build` | генерує `src/assets/data/tasks*.json` (автоматично перед `start`, `build`, `test:unit`) |
| `npm run content:todo -- --lang pl` | експорт ідей без перекладу |
| `npm run content:import -- --lang pl file.json` | імпорт перекладів і повторна перевірка |


## Фото ідей (Unsplash)
Картинки ідей — безкоштовні фото з Unsplash (ліцензія Unsplash дозволяє комерційне використання; атрибуція не обов'язкова, але ми її показуємо на сторінках ідей і в `docs/CREDITS.md`).
1. Знайдіть **безкоштовне** фото (не Unsplash+) без текстів, логотипів і впізнаваних облич.
2. Додайте в `content/photos.json`: `"task_025": { "photoId": "XXXX", "author": "Ім'я", "pageUrl": "https://unsplash.com/photos/…" }`.
3. `node scripts/import-photos.mjs --width 800` — завантажить фото, стисне до `src/assets/ideas/<slug>.jpg` і впише `image` + `photo` в файл ідеї.
4. `npm run content:check` перевіряє кредит і посилання; `docs/CREDITS.md` оновіть за потреби.
