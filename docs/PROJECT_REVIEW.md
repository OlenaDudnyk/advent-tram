# Advent Tram — огляд проєкту (дизайн, переклади, security, performance, SEO, web/tablet)

Дата: 2026-11-24. Що перевірено: `ng build`, `ng test` (29 тестів проходять), `ng lint`, `npm audit`, ручний прохід
по коду, grep по SCSS/HTML/TS, порівняння ключів перекладів. Чого **не** робилось: запуск у браузері, Lighthouse,
Playwright (немає встановлених браузерів), вичитка перекладів носіями мов.

Пріоритети: **P0** — зробити до релізу, **P1** — найближчий спринт, **P2** — коли буде час.

---

## 1. Підсумок

| Область | Стан | Головне |
|---|---|---|
| Дизайн | 🟡 | Єдина шкала заголовків і кольорів є, але в SCSS ще ~25 «сирих» hex-кольорів, 8 відтінків сірого тексту, 3 зелених і 2 рожевих; оболонка сторінки дублюється в 7 файлах; Home / Saved / Onboarding ще не переведені на нову дизайн-систему. |
| Переклади | 🟡 | Усі 6 мов мають 192/192 ключі, плейсхолдери збережені. Але `lang` у HTML завжди `en`, код `ua` не є валідним BCP-47 (має бути `uk`), 35 мертвих ключів, переклад машинний — потрібна вичитка. |
| Security | 🟡 | Критичних вразливостей немає (`npm audit`: 0, немає `innerHTML`, зовнішні посилання з `noopener`). Є: немає CSP, довіра до вмісту `localStorage` (може «вбити» додаток), EXIF у фото, `user-scalable=no`. |
| Performance | 🟡 | Початковий JS 589 kB (148 kB gzip) — переважно через імпорт Ionic не зі `/standalone`; Google Fonts блокують рендер; фото-спогади зберігаються як base64 до 5 МБ і переписуються цілим масивом. |
| SEO | 🔴 | Для пошуковиків зараз майже нічого немає: один `<title>`, жодного description / OG / canonical / robots / sitemap / hreflang, `/` одразу редіректить в онбординг. |
| Web / tablet | 🔴 | Увесь UI — одна колонка шириною 430 px по центру, на планшеті й десктопі це «телефон у рамці». |

---

## 2. Відповідність дизайну

### Що вже узгоджено (перевірено)
- Шкала заголовків у `src/theme/typography.scss` (32 / 22 / 20 / 15) і ніде локально не перевизначається, крім
  назв-плиток на Home (`.idea-card`, це підписи, не заголовки).
- Токени `--surface #F7F0EC`, `--surface-alt #EBE2DC` (`src/theme/variables.scss`); єдина система кнопок
  (`src/theme/buttons.scss`); єдиний вигляд аркушів (`ion-modal.sheet-modal`, радіус 28, висота за вмістом).

### Знахідки
| # | Що | Де | Рекомендація | P |
|---|---|---|---|---|
| D1 | Токени оголошені як CSS-змінні, але SCSS використовує літерали: `#ebe2dc` ×12, `#f7f0ec` ×10, `#7a1c2e` ×8, `#1b4332` ×7 … | усі `*.scss` | Використати `var(--surface)` тощо або спільні SCSS-змінні в `theme/_tokens.scss`; додати stylelint-правило `color-no-hex` з винятками | P1 |
| D2 | **8 відтінків сірого тексту**: `#2f2622 #292929 #4a3f39 #52453e #5b4f48 #6b5f58 #746960 #827872 #666` | різні сторінки | Звести до 3 токенів: `--ink`, `--ink-soft`, `--ink-muted` (перевірити контраст ≥ 4.5:1) | P1 |
| D3 | 3 «зелені» поверхні (`#dfe9df`, `#e6eae1`, `#e3ece3`) і 2 «рожеві» (`#f3e1e5`, `#f3e1e5`-варіанти) | календар, налаштування, Coffee | Токени `--mint`, `--blush` | P1 |
| D4 | Оболонка сторінки (`width: calc(100% - 24px); max-width: 430px; border-radius: 32px; margin …`) скопійована в 7 файлах (`home`, `route`, `saved`, `settings`, `coffee`, `deck`, `onboarding`) | `*.page.scss` | Компонент/клас `app-page-shell` — **передумова** для адаптації під планшет (розділ 7) | P0 для п. 7 |
| D5 | Тексти 9 px (`.memory-meta`, `.memory-edited`, заголовок секції Home, бейдж `+N` у календарі) | `home.page.scss`, `tram-route.page.scss` | Мінімум 11–12 px (читабельність, WCAG) | P1 |
| D6 | Не переведені на нову дизайн-систему (старий вигляд карток/кнопок/відступів): **Home** (плитки, стрічка спогадів), **Saved Ideas**, **Onboarding** | відповідні `scss` | Потрібні макети; до того — прибрати локальні кольори/розміри (onboarding має власні `$color-*` змінні) | P1 |
| D7 | Англ. дата в двох форматах: `12 December` (en-GB) і `December 12` (en-US) в різних місцях | `tram-route.page.ts` (`stopTitle` vs решта) | Обрати один формат для en | P2 |
| D8 | Ліміт стилів компонентів піднято до 8 kB (`angular.json`), `tram-route.page.scss` вже ~6 kB | `angular.json` | Винести спільне (кнопки, шапка аркуша, картки) у теми, повернути ліміт 4 kB | P2 |
| D9 | Темна тема: у `global.scss` підключено `dark.system.css` і `color-scheme: light dark`, а додаток має лише світлий дизайн → у темному режимі ОС Ionic-компоненти (toast, модалки, ion-content) змінюють кольори, а наші — ні | `src/global.scss`, `index.html` | Або зафіксувати світлу тему (прибрати палітру й `color-scheme: light`), або зробити темні токени | **P0** |
| D10 | Мертві/лишені файли й стилі: `.placeholder` ×4, `home.page` фільтр з параметром `day` (потік «знайти ідеї для дня» замінено колодою), `deck.never`, `route.shuffle` … | `src/app/**` | Видалити | P2 |

---

## 3. Переклади

Перевірено автоматично: у `ua/pl/es/de/fr` рівно 192 ключі в тому ж порядку, що й `en`; усі `{n}`/`{date}` на місці; порожніх значень немає;
ідентичні до англійської тільки бренд (`Advent Tram`) і запозичення (`Espresso`, `Cappuccino`, `Cheesecake`, `min`).

| # | Знахідка | Рекомендація | P |
|---|---|---|---|
| T1 | `<html lang="en">` не змінюється при зміні мови (скрінрідери, браузерний переклад, SEO). Крім того код `ua` невалідний (має бути `uk`) | Єдиний `LOCALE_TAGS` (`ua→uk`) і `document.documentElement.lang = …` у `StorageService.language` effect; `LANGUAGE_OPTIONS` лишити | **P0** |
| T2 | Збережена мова не валідується: `storage.loadSettings` робить `{...DEFAULT, ...JSON.parse(stored)}`; якщо в `localStorage` будь-яке не-вказане значення (`'xx'`, стара версія) → `translations[language][key]` кидає `TypeError` на кожному рендері — додаток «ламається» до очищення сховища | Валідація проти enum + fallback на `en` (див. S2) | **P0** |
| T3 | **35 мертвих ключів** у `en/ua/pl/es/de/fr` (наприклад `route.shuffle`, `route.scheduleIdea`, `route.noIdeas`, `route.findNew`, `route.selectSaved`, `route.noSaved`, `deck.never`, `home.soon`, `route.month`, `route.monthCaption`, `route.caption`, `route.visit`, `route.filter`, `route.emptyDay`, `route.backToDay`, `route.choosePhoto`, `route.note`, `route.genericReflection`, `route.scheduledDone`, `route.christmas`, `route.ideasForDay`, `route.calendarIcon`, `saved.schedule`, `memory.shared`, `coffee.cta`, `route.reflection`, `route.completed` …). *Ключі `coffee.tier*` використовуються через `environments/coffee.ts`, це хибне спрацювання.* | Видалити з усіх 6 файлів (зменшить обсяг на ~18 %); додати тест «усі ключі використовуються» | P1 |
| T4 | Переклади **машинні** (зроблені моделлю): високий ризик неприродних формулювань, особливо довгі описи 24 ідей, адвентська термінологія, звертання (ти/ви) | Вичитка носіями; глосарій термінів (Advent calendar / Church Advent / candle day / stop), узгодити звертання; tool на кшталт Crowdin/Weblate | P1 |
| T5 | Множина: використано «обхідні» формулювання (`Планів на цей день: {n}`, `Małe plany…: {n}`) — коректно, але англ./рос.-подібні форми з `1 / 2–4 / 5+` не реалізовано | Для нових лічильників користуватись `Intl.PluralRules` + ключі `_one/_few/_many` | P2 |
| T6 | Довші рядки: `fr 'filter.title'` (36 симв. у 32-px заголовку — 2 рядки, ок), `de 'route.addMemory'`, `pl 'route.nextStop'`. Перевірено лише за довжиною, **не візуально** | Прогнати скріншоти всіх екранів у 6 мовах (Playwright) і псевдолокаль ×1.4 | P1 |
| T7 | Жорстко прописані англ. тексти: `alt="Advent Tram"` в онбордингу, `title: 'Advent Tram'` у share, `<noscript>` англійською, `<title>`/`manifest` лише англійською | Переклад alt-тексту; локалізовані `title`/`description` (див. SEO) | P1 |
| T8 | Назви ідей у спогадах, збережених до зміни мови, показуються поточною мовою лише якщо ідея є в `tasks.json` (для кандидатів-свічок — зберігається стара назва) | Зберігати `taskId` + показувати локалізовану назву завжди; для свічок мапити `sunday_silence_*` | P2 |
| T9 | Формат дат: `LOCALES` (`en-GB`, `uk-UA`, `pl-PL`, `es-ES`, `de-DE`, `fr-FR`) — добре, але валюта `€` і формат чисел не локалізовані | `Intl.NumberFormat` для сум на Coffee | P2 |

---

## 4. Security

Оцінка загальна: **низький ризик** — додаток офлайн-first, без бекенду, без акаунтів, без вставки HTML.

| # | Знахідка | Ризик | Рекомендація | P |
|---|---|---|---|---|
| S1 | Немає **Content-Security-Policy** і security-заголовків | Середній | Заголовки на хостингу + `<meta http-equiv="Content-Security-Policy">` як запасний варіант: `default-src 'self'; img-src 'self' data: blob:; font-src 'self'; style-src 'self' 'unsafe-inline'; script-src 'self'; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'none'`. Додати `Referrer-Policy: strict-origin-when-cross-origin`, `X-Content-Type-Options: nosniff`, `Permissions-Policy: camera=(), microphone=(), geolocation=()`, HSTS. Після self-host шрифтів (P2) CSP стає суворішою | P0 |
| S2 | **Довіра до `localStorage`**: `JSON.parse` + spread у `loadSettings`; `loadTaskState` вірить масивам. Пошкоджені/старі дані → падіння (T2). Календар уже валідується (`parseDays`) — зразок для решти | Середній (надійність, self-DoS) | Схема-валідація (вручну або zod/valibot): мова ∈ enum, `ageGroups ⊂ AgeGroup[]` непорожній, `adventStyle ∈ {church, classic}`, масиви рядків; при помилці — `DEFAULT_SETTINGS` + `console.warn` | **P0** |
| S3 | **EXIF/GPS у фото**: `FileReader.readAsDataURL(file)` зберігає оригінал із метаданими (геолокація, модель), потім це ж фото може піти в Web Share | Середній (приватність дітей/родини) | Перекодувати через `<canvas>`/`createImageBitmap` (знімає EXIF, зменшує розмір — див. P4) | **P0** |
| S4 | `<meta viewport … maximum-scale=1, user-scalable=no>` забороняє масштабування | Низький/a11y (WCAG 1.4.4) | Прибрати `maximum-scale`/`user-scalable` | P0 |
| S5 | **Google Fonts** — сторонній запит із IP користувача (GDPR-ризик для ЄС: DE/FR/PL), блокує рендер, не кешується SW | Низький/Середній | Self-host (`@fontsource-variable/inter`, `outfit`, `nunito`, лише потрібні підмножини latin / latin-ext / cyrillic) | P1 |
| S6 | `inspirationUrl` валідується (http/https), але дозволено `http:` | Низький | Лише `https:`; дані в `tasks.json` під вашим контролем — додати CI-перевірку доменів (allowlist: pinterest, youtube, wikipedia…) | P2 |
| S7 | Service worker без UX оновлення (`SwUpdate`) — користувачі можуть місяцями сидіти на старій версії | Низький | `SwUpdate.versionUpdates` → toast «Є нова версія», `activateUpdate()+reload` | P1 |
| S8 | Немає UI «видалити всі мої дані / експорт» (`clearAllData` існує, але не підключений) | Низький (GDPR право на видалення) | Секція в Settings: «Експортувати», «Видалити всі дані» (з підтвердженням) | P1 |
| S9 | `crypto.randomUUID()` — відсутній у старих Safari (<15.4) | Низький | Fallback (`Date.now()+Math.random()`) | P2 |
| S10 | Політика конфіденційності відсутня (потрібна для App Store / Google Play / GDPR / SEO-довіри) | — | Сторінка `/privacy` у 6 мовах: «дані лишаються на пристрої; зовнішні посилання: PayPal, Monobank, Pinterest, YouTube» | P0 для публікації |

Підтверджено безпечним: немає `innerHTML`/`bypassSecurity*`/`eval`; усі `target="_blank"` мають `rel="noopener noreferrer"`;
query-параметри (`day`, `taskId`, `location`, `duration`) валідуються перед використанням; платіжні URL беруться лише з конфігу,
не від користувача; `npm audit --omit=dev` → 0 вразливостей.

---

## 5. Performance

Поточні цифри (`ng build`): initial **684 kB raw / 171 kB gzip** (main 589 kB / 148 kB), styles 51 kB / 6.6 kB;
найбільший lazy-чанк — календар 29 kB / 7.6 kB.

| # | Знахідка | Вплив | Рекомендація | P |
|---|---|---|---|---|
| P1 | Усі 11 імпортів Ionic — з `@ionic/angular` (не `/standalone`) → гірший tree-shaking, велика основа bundle | -20…35 % initial JS | Перейти на `@ionic/angular/standalone` (`IonContent`, `IonModal`, `IonToast`, `NavController`, `createGesture`, `createAnimation`), зареєструвати лише потрібні іконки; перевірити `source-map-explorer` | P1 |
| P2 | Шрифти з Google: 3 сімейства × до 4 ваг, render-blocking, без `preconnect`, не в SW → FOUT/CLS і нестабільний LCP, офлайн — системний шрифт | LCP/CLS | Self-host варіативних WOFF2 з `font-display: swap`, `<link rel="preload">` для 1–2 критичних; зменшити ваги (Inter 400/600, Outfit 700, Nunito 700) | P1 |
| P3 | Спогади: фото як base64 до 5 МБ; **кожна** операція (`save/update/delete/getFeedEntries`) читає й переписує **весь масив** у IndexedDB; Home малює повнорозмірні `data:` в `<img>` без `loading=lazy/decoding=async` | Пам'ять, лаги, ризик квоти (особливо iOS) | Зберігати кожен запис окремим ключем (або `FeedEntry` без фото + `Blob` у окремому сховищі), даунскейл до ≤1600 px і WebP/JPEG q≈0.8 (одночасно знімає EXIF), мініатюри ≈400 px для стрічки, `loading="lazy" decoding="async"`, віртуалізація/пагінація після ~50 записів | P0/P1 |
| P4 | Ілюстрації — SVG-обгортки навколо base64-JPEG (`gifts 88 K`, `gingerbread 100 K`, `forest-centerpiece 116 K`, `tram 116 K`) — не стискаються і не кешуються як растр | Вага, декодування | Конвертувати в **WebP/AVIF** (2 розміри + `srcset`), `tram` — preload на онбордингу; `ngsw` — `installMode: prefetch` для 5–6 ключових зображень | P1 |
| P5 | Снігопад: `requestAnimationFrame` 60 fps на **кожному** екрані, до 90 крапель, DPR до 2 | Батарея/слабкі Android | Обмежити 30 fps, пауза при відкритому модальному вікні/`document.hidden` (є) / `prefers-reduced-motion` (є) / `Save-Data`; віддавати на `OffscreenCanvas` у worker (P2) | P2 |
| P6 | `PreloadAllModules` — одразу вантажить усі lazy-чанки (~100 kB) | Невеликий | Лишити (чанки малі) або `QuicklinkStrategy` | P2 |
| P7 | `ngsw-config.json`: `tasks.json` не в `dataGroups`; завантаження через `'/assets/data/tasks.json'` (**абсолютний шлях** — зламається під `base href` ≠ `/`) | Надійність офлайн/деплой | Відносний шлях `assets/data/tasks.json` + `dataGroups` (`freshness`, `maxAge` 1 d) | P1 |
| P8 | `main.ts` не має явного `provideHttpClient(withFetch())` (працює завдяки `providedIn: 'root'`, але без fetch-бекенду й SSR-сумісності) | Низький | Додати явно | P2 |
| P9 | Lighthouse/Web Vitals не вимірювались | — | Налаштувати Lighthouse CI (mobile, Moto G4 throttling) із бюджетами: LCP ≤ 2.5 s, CLS ≤ 0.1, INP ≤ 200 ms, JS ≤ 200 kB gzip | P1 |

---

## 6. SEO (і соцмережі) — що додати, щоб додаток і сайт були видимі

**Корінна проблема:** додаток — клієнтський SPA, вхід `/` редіректить на `/onboarding`, контент залежить від `localStorage`.
Пошуковик бачить порожню оболонку без тексту. Для пошуку потрібен **окремий публічний, пререндерений шар** із контентом.

### 6.1 Технічна база (до ~1 дня)
1. `index.html`: унікальні `<title>` (≤ 60 симв.), `<meta name="description">` (≤ 155), `<link rel="canonical">`,
   Open Graph (`og:title/description/image 1200×630/url/type/locale`), Twitter Card (`summary_large_image`), `theme-color`,
   `<meta name="color-scheme" content="light">`.
2. `public/robots.txt` (дозволити `/`, закрити `/saved`, `/settings`, `/onboarding`; вказати sitemap) і `public/sitemap.xml`.
3. `<html lang>` динамічно (`uk` для `ua`!) — див. T1.
4. `manifest.webmanifest`: додати `id`, `description`, `lang`, `categories` (`lifestyle`,`kids`), `screenshots` (narrow + wide),
   `shortcuts` (Календар, Ідеї), `orientation: any` — покращує інсталяцію й Play-лістинг.
5. Прибрати `user-scalable=no` (S4); Core Web Vitals (P1–P4) — це ранжувальні фактори.
6. Google Search Console + Bing Webmaster, подати sitemap, IndexNow.

### 6.2 Публічний контент, який індексується (основна віддача)
- **Пререндер/SSR**: `ng add @angular/ssr` (static prerender) або окремий лендінг (Astro/Eleventy) на тому ж домені.
  Структура: `/` (home лендінг), `/uk/`, `/pl/`, `/es/`, `/de/`, `/fr/`, додаток під `/app/…`.
- **hreflang** для 6 мов + `x-default` у `<head>` і sitemap; кожна мовна версія має власні title/description.
- **Сторінка на кожну ідею** (24+ шт., 6 мов = 144 URL): `/ideas/paper-stars` з назвою, описом, фото, «Що потрібно / час / вік»,
  JSON-LD `HowTo` або `Article`. Це **найсильніший** канал: довгі запити на кшталт «різдвяні заняття для дітей 3–6 років»,
  «adventskalender ideen familie», «pomysły na adwent z dziećmi».
- Сторінки: «Що таке церковний адвент і 4 свічки», «Як користуватись Advent Tram», FAQ (JSON-LD `FAQPage`), «Про автора», `/privacy`.
- JSON-LD `SoftwareApplication`/`WebApplication` (назва, `applicationCategory: LifestyleApplication`, `offers: 0`, рейтинг — коли з'явиться).
- Внутрішня перелінковка: ідея → календар → завантажити додаток; хлібні крихти (`BreadcrumbList`).

### 6.3 Маркетплейси й соцмережі (SMM)
- **Google Play через TWA (Bubblewrap/PWABuilder)** і App Store (Capacitor — `@capacitor/*` уже в залежностях): ASO — ключові слова
  в назві/описі кожною локаллю, 6–8 скріншотів, відео-прев'ю.
- **Share-картки**: генерувати OG-зображення зі спогаду/ідеї (canvas → PNG 1200×630 і вертикальна 1000×1500 для Pinterest),
  шеринг з UTM-мітками (`?utm_source=share&utm_medium=memory`).
- **Pinterest** (найкращий канал для сімейних ідей): rich pins з сайтом, вертикальні піни на кожну ідею.
  Instagram/TikTok — короткі відео «ідея дня» + посилання на сторінку ідеї.
- Backlinks: добірки «advent calendar apps», блоги про сімейні традиції, Product Hunt, Reddit (r/Parenting, r/ukraine), DOU/спільноти.
- Аналітика без кукі (Plausible/Umami self-host) + події: `install`, `schedule_idea`, `share_memory`, `coffee_click`.

### 6.4 Чек-лист «що мало б бути до запуску»
`robots.txt` ✔︎ `sitemap.xml` ✔︎ canonical ✔︎ OG/Twitter ✔︎ hreflang ✔︎ JSON-LD ✔︎ prerender ✔︎ `/privacy` ✔︎ Search Console ✔︎ Lighthouse ≥ 90 SEO/Perf.

---

## 7. План адаптації під web і планшет

**Зараз:** кожна сторінка — `max-width: 430px` по центру, фіксована висота колоди, модальні аркуші `max-width: 430px`,
жодних медіа-запитів. Навіть на 1440 px це «телефон у рамці».

### Брейкпоінти й токени
`sm` < 600 (телефон), `md` 600–1023 (планшет), `lg` ≥ 1024 (десктоп), `xl` ≥ 1440. Змінні: `--shell-max` (430 / 720 / 1120),
`--gutter` (12 / 24 / 32), типографіка через `clamp()` (h1 32→40).

### Етап 0 — підготовка (1–2 дні, **блокер**)
- Компонент/клас `app-page-shell` (прибрати дублювання з 7 SCSS — D4), токени брейкпоінтів, `Breakpoints` сервіс на `BreakpointObserver`.
- Вимірювальні відео/скріншоти в Playwright: iPhone SE / iPhone 15, iPad (портрет + ландшафт), 1280×800, 1440×900.

### Етап 1 — планшет (портрет/ландшафт), 3–5 днів
| Екран | Рішення |
|---|---|
| Home | Дві колонки: ліворуч плитки «Знайти ідеї» / «Календар», праворуч стрічка спогадів; шапка з іконками лишається |
| Календар | **Master-detail**: сітка ліворуч (7 колонок для церковного режиму читається краще), праворуч **панель дня** замість модалки (`ion-split-pane`/CSS grid); `NEXT STOP` під сіткою |
| Колода | Картка у ландшафті: зображення ліворуч, текст праворуч; стрілки/свайп, `←/→` з клавіатури; висота — `min(100dvh - 32px, 760px)` |
| Налаштування | Дві колонки (мова/вікові групи | режим адвенту/банер) |
| Coffee | Три плитки в рядок |
| Модалки | `sheet-modal` шириною 560 px по центру (а не притиснуті знизу); діалоги підтвердження — 400 px |
| Safe-area | `env(safe-area-inset-*)`, ландшафт iPad з Stage Manager |

### Етап 2 — web / десктоп, 3–5 днів
- Верхня навігація (Головна · Календар · Збережені · Налаштування · ☕) замість іконок у шапці; `lg` — бічне меню в `ion-split-pane`.
- Миша й клавіатура: hover-стани, видимий `:focus-visible` (частково є), `Esc` закриває модалки, `Enter/Space` перегортає картку,
  `←/→` гортає колоду, `Tab`-порядок у модалках (focus trap — Ionic дає), «скролбар» у `sheet`-контейнерах.
- Ширини: контент до 1120 px, фон-сніг на весь вікно (вже `position: fixed`), зображення з `srcset` до 2×.
- Роутинг під SEO: публічні сторінки (розділ 6) поза `ion-router-outlet`, додаток під `/app`.

### Етап 3 — PWA/інсталяція на великих екранах, 1–2 дні
- `manifest`: `display_override: ['window-controls-overlay','standalone']`, `screenshots` з `form_factor: wide`, `orientation: any`.
- Кнопка «Встановити» (`beforeinstallprompt`), `SwUpdate` toast (S7), іконки maskable ✔︎ (є 192/512).

### Етап 4 — тестування й якість, постійно
- Playwright-проєкти: `iPhone 15`, `Pixel 7`, `iPad Pro 11 (portrait/landscape)`, `Desktop 1280/1440` × 6 мов — скріншоти-базліни.
- Lighthouse CI + axe-core (a11y) у CI; «приймальні» перевірки: жодного горизонтального скролу, touch-targets ≥ 44 px,
  текст ≥ 12 px, контраст ≥ 4.5:1.

### Оцінка (1 розробник)
| Етап | Днів | Залежності |
|---|---|---|
| 0. Shell + токени + тест-інфраструктура | 1–2 | — |
| 1. Планшет | 3–5 | 0 |
| 2. Desktop/web | 3–5 | 0, 1 |
| 3. PWA на великих екранах | 1–2 | 2 |
| SEO-шар (розділ 6.1–6.2) | 4–6 | 0 (shell), перекладів немає потреби |
| **Разом** | **≈ 12–20 днів** | |

---

## 8. Якість коду й тести (супутнє)
- `ng lint`: 3 помилки порядку імпортів у `src/main.ts` (не змінювались).
- Playwright e2e: **застаріли** (`.header-saved` ×7 у `saved-ideas.spec.ts`, потік колоди/календаря змінено), браузери не встановлені — у CI вони не запустяться.
- Юніт-тести: 29. Немає тестів для `TramRoutePage`, `HomePage` (частково), `SettingsPage`, `CoffeePage`, `MemoryFormComponent`, `ShareService`, `NavigationHistoryService`.
- Мертвий код: `TasksService.getNextTask/getPostponedTasks`, фільтр «day» на Home, `StorageService.rejectTask/postponeTask` (більше немає дій у UI).
- Документи `ARCHITECTURE.md`, `ONBOARDING_DESIGN.md`, `QUICKSTART.md` — застарілі щодо поточної поведінки.

---

## 9. Рекомендований порядок робіт

**Тиждень 1 (P0, ~2–3 дні):** T1, T2/S2 (валідація сховища), D9 (світла тема), S4 (viewport), S3+P3 (перекодування фото: EXIF + розмір), S1 (CSP/заголовки), S10 (privacy).
**Тиждень 2 (P1):** SEO-база 6.1, self-host шрифтів (S5/P2), Ionic standalone (P1), видалення мертвих ключів (T3), SwUpdate (S7), вичитка перекладів (T4).
**Тижні 3–4:** Етап 0–1 адаптації (shell + планшет), SEO-сторінки ідей, тестова інфраструктура.
**Далі:** desktop, TWA/App Store, SMM-інструменти (share-картки).

---

## 10. Статус P0 (2026-11-24) — виконано

| Пункт | Що зроблено |
|---|---|
| T1 / lang | `<html lang>` синхронізується з мовою додатку; `ua` → `uk` (`LANGUAGE_TAGS`); мова застосовується ще до першої сторінки |
| T2 / S2 | `sanitizeSettings()` — невідома мова → `en`, некоректні/порожні вікові групи → `family`, невідомий стиль адвенту → `church`; стан ідей фільтрує нерядкові значення; є юніт-тести |
| S3 + P3 | `ImageService.prepareMemoryPhoto`: перекодування через canvas (знімає EXIF/GPS, застосовує орієнтацію), ≤1600 px, JPEG q0.82; ліміт файлу піднято до 20 МБ (тексти помилок оновлено в 6 мовах) |
| D9 | Лише світла тема: прибрано `dark.system`, `color-scheme: light` |
| S4 | З viewport прибрано `maximum-scale` і `user-scalable=no` |
| S1 | `public/_headers`: CSP, Referrer-Policy, nosniff, Permissions-Policy, HSTS, COOP, кеш для `ngsw`/`index`; продакшен-збірка без inline-скриптів (`inlineCritical: false`) — сумісна з `script-src 'self'` |
| S10 | Сторінка `/privacy` у 6 мовах + посилання з налаштувань |
| **Нова знахідка** | `public/` (manifest, іконки, apple-touch-icon) **не копіювалась у збірку** — додано в `angular.json` `assets`; тепер PWA-манифест, іконки й `_headers` потрапляють у `www/` |
| Побічне | `saveSettings` більше не ковтає помилки (екран налаштувань тепер може показати збій і відкотити зміну) |

Залишається за цим документом: P1 (SEO-база, self-host шрифтів, Ionic standalone, мертві ключі, SwUpdate, вичитка перекладів) і адаптація під планшет/web.

---

## 11. Статус P1 (2026-11-24)

**Зроблено**
| Пункт | Що |
|---|---|
| SEO-база (6.1) | `<title>`, description, canonical, Open Graph, Twitter Card, JSON-LD `WebApplication` у `index.html`; `robots.txt`, `sitemap.xml`; `og-image.jpg` 1200×630; `SeoService` оновлює title/description/`og:locale` при зміні мови (6 мов); manifest: `id`, `description`, `lang`, `categories`, `orientation`, `shortcuts`; `theme-color` |
| SITE_URL | Абсолютні URL — через `SITE_URL=https://ваш-домен npm run build` (скрипт `scripts/finalize-seo.mjs`). Без змінної canonical/og:url/hreflang/sitemap **вилучаються**, щоб нічого не вказувало на заглушку |
| Шрифти (S5/P2) | Google Fonts прибрано: self-host `@fontsource-variable` (Inter, Outfit, Nunito) — підмножини latin / latin-ext / cyrillic вантажаться за потреби, працюють офлайн; CSP без сторонніх доменів; privacy-текст оновлено |
| Мертві ключі (T3) | Видалено 29 невикористаних ключів у всіх 6 мовах (192 → 174) |
| tasks.json (P7) | Відносний шлях + `dataGroups` у `ngsw-config.json` (freshness, 1 день) |
| SwUpdate (S7) | `AppUpdateService`: тост «Нова версія готова — Оновити» |
| Мої дані (S8) | Налаштування → «Експортувати мої дані» (JSON-копія) і «Видалити всі дані» (з підтвердженням, потім онбординг) |
| Дизайн-токени (D2/D3/D5) | 12 → 3 відтінки сірого тексту (`#2f2622`, `#5b4f48`, `#6b5f58`, вищий контраст), 3 → 1 зелена поверхня, тексти ≥ 11 px (10 px для бейджа «+N») |
| T7 | Декоративне зображення онбордингу — порожній `alt` |
| Додатково | Вхід `/` тепер веде користувача, що вже налаштував додаток, на Home, а не щоразу в онбординг |
| T4 | `docs/TRANSLATION_REVIEW.md` — глосарій, спірні терміни, чек-лист для рецензента |

**Скориговано:** пункт «Ionic standalone» (P1 у розділі 5) **неактуальний** — в Ionic 9 компоненти вже standalone з основного входу
(`@ionic/angular/standalone` існує лише в Ionic 8). Розмір initial bundle не змінився (≈ 590 kB / 149 kB gzip).

**Не зроблено (потребує окремого рішення/інструментів):** WebP/AVIF-ілюстрації (немає `cwebp`/sharp у середовищі), Lighthouse CI,
Playwright-скріншоти в 6 мовах (немає браузерів), вичитка носіями, hreflang та мовні URL (потребують пререндеру/SSR — етап SEO 6.2),
повне виведення решти кольорів на CSS-змінні (D1).

---

## 12. Статус адаптації під планшет (2026-11-24)

Зроблено етапи 0–1 з розділу 7 (перевірено в браузері на 820×1180 та 1180×820 для календаря, колоди, головної, налаштувань і Coffee).

| Що | Як |
|---|---|
| Брейкпоінти | `theme/layout.scss`: phone < 600, tablet 600–899, wide ≥ 900; токени `--shell-max` (430 / 720 / 1040), `--sheet-max` (430 / 560), `--dialog-max` (340 / 420); `LayoutService` (`tablet`, `wide` signals) |
| Шкала заголовків | На планшеті кожен рівень на крок більший (h1 38, h2 24, h3 22) — шкала лишається єдиною |
| Календар | ≥ 900 px: **дві панелі** — сітка зліва, панель дня справа (той самий вміст, що й у модалці, через спільний `ng-template`); < 900 px — як і раніше аркуш-модалка; при повороті пристрою вибраний день не губиться |
| Головна | ≥ 900 px: плитки зліва, стрічка спогадів справа; планшет-портрет: вищі плитки з більшими картинками |
| Колода | Більша картинка і текст на планшеті; у ландшафті картка двоколонкова (малюнок \| текст); у портреті — картка по центру з обмеженою висотою |
| Налаштування | Дві колонки (мова / вікові групи → адвент / мої дані), банер і політика на всю ширину |
| Coffee | Три плитки в рядок |
| Збережені | Дві колонки карток |
| Модалки | Аркуші до 560 px, діалоги до 420 px |
| Тести | Playwright-проєкти «Tablet portrait» і «Tablet landscape» (потрібні встановлені браузери) |

Не зроблено: верхня навігація й бічне меню для десктопа (етап 2), `display_override`/скріншоти манифесту (етап 3), скріншот-базліни в CI.


---

## 13. Статус етапів 2–3: web / desktop (2026-11-25)

| Що | Як |
|---|---|
| Верхня навігація | `app-top-nav` на екранах ≥ 900 px (крім онбордингу): бренд → Home, Календар, Збережені, Налаштування, Coffee; активний пункт підсвічується; висота бару віднімається від висоти сторінок (`--nav-h`); іконки-дублі в шапці Home на wide ховаються |
| Клавіатура | У колоді `←` / `→` гортають ідеї (не спрацьовує під час введення тексту й у відкритих діалогах); `Esc` закриває модалки (вбудовано в Ionic); фокус-кільця вже є |
| Миша | Hover-стани лише для пристроїв з курсором (`@media (hover: hover)`): кнопки, іконки, клітинки календаря, плитки Home, чипи, картки Coffee |
| Інсталяція (етап 3) | `InstallService` перехоплює `beforeinstallprompt`; у Налаштуваннях з'являється секція «Встановити застосунок», коли браузер дозволяє; manifest отримав `display_override` |
| Різне | `ng lint --fix` виправив порядок імпортів у `main.ts` (лінт тепер без помилок) |

Не зроблено: скріншоти для manifest (потрібні готові PNG 1280×720 та 750×1334), скріншот-базліни в CI, Lighthouse CI.


---

## 14. Статус SEO-шару (розділ 6.2) — 2026-11-25

Замість важкого SSR зроблено **статичні сторінки, що генеруються під час збірки** (`scripts/seo-pages.mjs`, викликається з `npm run build`):

| Що | Деталі |
|---|---|
| Сторінки | 6 мов × (1 вітрина + 24 ідеї) = **150 HTML-файлів**: `/{en,uk,pl,es,de,fr}/` та `/{мова}/ideas/{slug}/` |
| Вміст | Назва, опис, малюнок, час / де / для кого (з `tasks.json` та його `i18n`), кнопка «Відкрити Advent Tram»; чистий HTML + inline CSS, без JS |
| Метадані | `<html lang>`, title, description, `robots`, canonical, **hreflang** (6 мов + x-default), Open Graph (растровий `og-image.jpg`), JSON-LD `Article` та `ItemList` |
| Sitemap | `sitemap.xml` з усіма 152 URL та `xhtml:link` альтернативами (лише з `SITE_URL`) |
| App-root | При `SITE_URL` до `index.html` додаються hreflang-посилання на 6 вітрин |
| Service worker | У `ngsw-config.json` додано `navigationUrls`-винятки для `/{мова}/**`, щоб SW повертав ці сторінки, а не SPA |
| Перевірено | Усі JSON-LD валідні; збірка з `SITE_URL` та без нього; сторінки відкриваються в браузері |

Щоб ввімкнути: `SITE_URL=https://ваш-домен npm run build`, віддавати `www/` будь-яким статичним хостингом (директорії з `index.html` обслуговуються без SPA-фолбеку).
Далі: подати `sitemap.xml` у Search Console / Bing, додати посилання на вітрини з головної сторінки сайту та з App Store / Google Play лістингу.


---

## 15. Інфраструктура для постійного розширення ідей (2026-11-25)

Детальна інструкція — `docs/CONTENT.md`. Коротко:

| Було | Стало |
|---|---|
| Один `tasks.json` з усіма мовами, правки руками, ілюстрації прописані в коді (TS + скрипт) | **По файлу на ідею** в `content/ideas/<slug>.json` — єдине джерело; `tasks.json` і `tasks.<мова>.json` генеруються (в `.gitignore`) |
| Усі переклади вантажаться разом | Користувач вантажить **лише основу + свою мову**; додаток доповнює англійською, якщо перекладу ідеї нема |
| Нових ідей — ручна робота й ризик помилок | `npm run idea:new`, `content:check` (схема, унікальні id/slug, ліміти довжин, дозволені https-домени, існування картинки, покриття перекладів), `content:todo` / `content:import` для перекладів |
| SEO-сторінки з жорстким списком | Генеруються з тих самих файлів: лише мови з повним перекладом, hreflang лише для наявних, пагінація (24 на сторінку), блок «Більше ідей», `lastmod`, sitemap по мовах + індекс |
| Чернетки неможливі | `status: "draft"` — ідея не потрапляє ні в додаток, ні на сайт |
| Ручні перевірки | `.github/workflows/ci.yml`: content:check → lint → unit → build; `prestart`/`prebuild`/`pretest:unit` самі перегенеровують дані |

Існуючі 24 ідеї мігровано без змін (`id` збережено — на них посилаються дані користувачів; slug-и теж ті самі, тож SEO-адреси не змінились).
Поле `illustration` замінено на `image` (файл у `src/assets`), модель `Task` та `illustrationFor` оновлено.


---

## 16. Дизайни для планшета й вебу (2026-11-25)

Реалізовано за макетами `Tablet · …` / `Desktop · …` (Tram Route, порожній/заповнений день, Swipe ideas, Settings, Coffee):

| Що | Деталі |
|---|---|
| Рамка | Нове: бренд + слоган, вкладки Home · Swipe Ideas · Tram Route · Saved · Settings · Coffee (активна — зелена таблетка), розділювач і підпис «DECEMBER LINE · ONE MEMORY AT A TIME» **усередині картки**; на телефоні не показується. Попередню верхню панель поза карткою прибрано |
| Брейкпоінти | tablet ≥ 600 px (діалог дня по центру, бренд над вкладками), wide ≥ **1024** px (бренд і вкладки в одному рядку, панель дня збоку) |
| Календар | Місячна сітка «пн–нд», круглі кнопки ‹ › (листають листопад/грудень у церковному режимі), дні поза адвентом приглушені, кружечок × у діалозі, порожній день з трамваєм і «A little room for magic.»; «Next stop» на планшеті/вебі прихований |
| Колода | Картка: картинка зліва, справа підпис («A little outdoor magic»), заголовок, пігулка «15 min · Family», опис; стрілки по боках, лічильник «06 / 24» і смуга «The little how-to». **Без кнопок Never/Later/+Schedule** (за вашим рішенням) |
| Налаштування | Білі картки «Language» (з назвою мови) і «Who's riding?», «Your Advent, your pace» з галочкою на вибраному, банер з кнопкою Save preferences (зміни й так зберігаються миттєво — кнопка лише підтверджує) |
| Coffee | Ліворуч картки напоїв з галочкою, праворуч велика картка «A little kindness goes a long way.» з великим фото вибраного напою |
| Інше | Новий ключ-мова перекладів (15 рядків × 6 мов); при відсутності PayPal-посилання кнопка підтримки використовує банку Monobank для всіх мов; `docs/DEPLOY.md` — хостинг, домен, посилання, Search Console |

Не зроблено: Home і Saved на планшеті/вебі отримали лише рамку (макетів не було); велике зображення напою в картці Coffee розтягнуте з 184 px — потрібні файли більшого розміру.
