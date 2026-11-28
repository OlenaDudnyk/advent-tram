# Чернетки ідей (українською)

Файл `ideas-uk.json` — список ідей для редагування. Ви можете змінювати будь-які тексти, а також:
- `"keep": false` — не імпортувати цю ідею (або просто видаліть її з файлу);
- `location`: `"in"` (вдома) або `"out"` (надворі);
- `duration`: 5, 15, 30 або 60 (60 = година і більше);
- `ageGroups`: `kids_3_6`, `kids_7_12`, `adults`, `family`;
- `category`: `"heart_deed"` лише для ідей доброти;
- ліміти: `title` ≤ 60, `shortDesc` ≤ 90, `fullDesc` 30–700 символів.

Поле `n` — просто номер для розмови («змініть №47»), його можна не чіпати.

Коли закінчите:
```bash
npm run content:drafts            # перевірка файлу без змін (показує помилки й що буде створено)
npm run content:drafts -- --write # створює content/ideas/*.json зі status "draft" (в застосунок вони ще не потрапляють)
```
Далі ідеї переглядаються в `content/ideas/`, до них додаються переклади (`npm run content:todo -- --lang en`) і лише потім `"status": "published"`.

## Додаткові поля (необов'язкові)
- `inspiration`: `{ "url": "https://www.pinterest.com/pin/…", "type": "pinterest" }` — кнопка «Ідеї на Pinterest» на картці.
- `list`: `{ "kind": "music|film|book|links", "items": ["Текст", { "text": "Текст", "url": "https://…" }] }` — список із посиланнями на звороті картки.
- Посилання лише `https` і лише з дозволених доменів (`content/config.json` → `allowedInspirationHosts`).
