# Вичитка перекладів — глосарій і чек-лист

Переклади PL / ES / DE / FR (і частково UA) створені моделлю, тому перед публікацією їх має переглянути носій мови.
Нижче терміни, які **використовуються зараз**, і місця, де сумнів найбільший (позначено ⚠).

## Глосарій (поточний стан)

| Поняття | EN | UA | PL | ES | DE | FR |
|---|---|---|---|---|---|---|
| Маршрут / календар | Tram Route | Маршрут трамвая | Trasa tramwaju | Ruta del tranvía | Tramlinie | Ligne du tram |
| День-зупинка | Stop | Зупинка | Przystanek | Parada | Halt ⚠ (Haltestelle?) | Arrêt |
| Церковний адвент | Church Advent | Церковний (традиційний) адвент | Adwent kościelny | Adviento de la Iglesia ⚠ | Kirchlicher Advent ⚠ | Avent liturgique |
| Класичний відлік | Classic countdown | Класичний відлік | Klasyczne odliczanie | Cuenta atrás clásica | Klassischer Countdown | Compte à rebours classique |
| День зі свічкою | Silence & Candle | Тиша і свічка | Cisza i świeca | Silencio y vela | Stille & Kerze | Silence et bougie |
| Добра справа | Heart / mercy deed | Добра справа | Dobry uczynek serca | Gesto de corazón / bondad ⚠ | Herz / gute Tat ⚠ | Geste de cœur / de bonté |
| Спогад | Memory | Спогад | Wspomnienie | Recuerdo | Erinnerung | Souvenir |
| Збережені ідеї | Saved Ideas | Збережені ідеї | Zapisane pomysły | Ideas guardadas | Gemerkte Ideen | Idées enregistrées |

## Звертання
EN нейтральне · UA «ви» · PL «Ty/Wy» (змішано ⚠ — обрати одне) · ES «tú» · DE «du» · FR «vous».

## Чек-лист для рецензента
1. Прочитати **весь інтерфейс на телефоні**, а не таблицю ключів: чи не обрізаються кнопки, заголовки, підписи в календарі.
2. Перевірити терміни з таблиці (⚠) і узгодити звертання (PL).
3. 24 описи ідей (`src/assets/data/tasks.json` → `i18n`): природність, відповідність віку, культурна доречність.
4. Тексти для SEO: `seo.title` (≤ 60 симв.), `seo.description` (≤ 155).
5. Приватність (`privacy.*`) — юридична точність для вашої юрисдикції.
6. Правки вносити в `src/app/core/i18n/<мова>.ts`; мертвих і зайвих ключів немає (перевіряє TypeScript).

## Автоматичні перевірки, які вже є
- Набір ключів у всіх 6 мовах збігається з `en.ts` (інакше помилка збірки — `Record<TranslationKey, string>`).
- Плейсхолдери `{n}`, `{date}` збережені (перевірено скриптом).
