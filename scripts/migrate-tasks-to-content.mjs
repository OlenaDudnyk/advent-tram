// ONE-TIME migration: src/assets/data/tasks.json (single file with embedded translations)
// -> content/ideas/<slug>.json (one file per idea). Ids are preserved because user data references them.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { DATA_DIR, IDEAS_DIR, slugify } from './content-lib.mjs';

const ART = {
  'forest-centerpiece': 'forest-centerpiece.svg', 'gingerbread-cookies': 'gingerbread.svg', 'baking-afternoon': 'gingerbread.svg',
  'hot-cocoa': 'coffee-cappuccino.png', 'blanket-nook': 'coffee-cappuccino.png', 'movie-night': 'coffee-cappuccino.png',
  'candlelit-wish': 'idea-candle.svg', 'winter-song': 'idea-candle.svg',
  'paper-stars': 'idea-craft.svg', 'paper-snowflakes': 'idea-craft.svg', 'gratitude-garland': 'idea-craft.svg',
  'gift-tags': 'idea-craft.svg', 'festive-letters': 'idea-craft.svg', 'memory-scrapbook': 'idea-craft.svg',
};
const tasks = JSON.parse(readFileSync(join(DATA_DIR, 'tasks.json'), 'utf8'));
mkdirSync(IDEAS_DIR, { recursive: true });
const used = new Set();
for (const t of tasks) {
  let slug = slugify(t.title);
  if (used.has(slug)) slug = `${slug}-${t.id}`;
  used.add(slug);
  const text = { en: { title: t.title, shortDesc: t.shortDesc, fullDesc: t.fullDesc } };
  for (const [lang, v] of Object.entries(t.i18n ?? {})) text[lang] = { title: v.title, shortDesc: v.shortDesc, fullDesc: v.fullDesc };
  const idea = {
    id: t.id, slug, status: 'published', addedAt: '2026-11-01',
    location: t.location, duration: t.duration, ageGroups: t.ageGroups,
    ...(ART[t.illustration] ? { image: ART[t.illustration] } : {}),
    ...(t.category ? { category: t.category } : {}),
    tags: [],
    ...(t.inspirationUrl ? { inspiration: { url: t.inspirationUrl, ...(t.inspirationType ? { type: t.inspirationType } : {}) } } : {}),
    text,
  };
  writeFileSync(join(IDEAS_DIR, `${slug}.json`), `${JSON.stringify(idea, null, 2)}\n`);
}
console.log(`Migrated ${tasks.length} ideas to content/ideas/`);
