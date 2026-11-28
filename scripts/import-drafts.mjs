// Turns the reviewed drafts (content/drafts/ideas-uk.json) into draft ideas in content/ideas/.
//   npm run content:drafts            validate only
//   npm run content:drafts -- --write create the files (status "draft", Ukrainian text only)
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { IDEAS_DIR, ROOT, config, loadIdeas, nextId } from './content-lib.mjs';

const write = process.argv.includes('--write');
const file = join(ROOT, 'content/drafts/ideas-uk.json');
const drafts = JSON.parse(readFileSync(file, 'utf8'));

const MAP = { а: 'a', б: 'b', в: 'v', г: 'h', ґ: 'g', д: 'd', е: 'e', є: 'ye', ж: 'zh', з: 'z', и: 'y', і: 'i', ї: 'yi', й: 'y', к: 'k', л: 'l', м: 'm', н: 'n', о: 'o', п: 'p', р: 'r', с: 's', т: 't', у: 'u', ф: 'f', х: 'kh', ц: 'ts', ч: 'ch', ш: 'sh', щ: 'shch', ь: '', ю: 'yu', я: 'ya', 'ʼ': '', '’': '', "'": '' };
const slugify = (s) => [...s.toLowerCase()].map((c) => MAP[c] ?? c).join('').normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60).replace(/-+$/g, '');

const existing = loadIdeas();
const usedSlugs = new Set(existing.map((i) => i.data?.slug));
const usedTitles = new Set(existing.map((i) => i.data?.text?.ua?.title?.toLowerCase()).filter(Boolean));
const L = config.limits;
const errors = [];
const plan = [];
let counter = Number(nextId(existing).replace('task_', ''));

for (const d of drafts) {
  if (d.keep === false) continue;
  const at = (m) => errors.push(`#${d.n ?? '?'} «${d.title}»: ${m}`);
  if (!d.title?.trim() || d.title.length > L.title) at(`title must be 1-${L.title} chars`);
  if (!d.shortDesc?.trim() || d.shortDesc.length > L.shortDesc) at(`shortDesc must be 1-${L.shortDesc} chars`);
  if (!d.fullDesc || d.fullDesc.length < L.fullDescMin || d.fullDesc.length > L.fullDesc) at(`fullDesc must be ${L.fullDescMin}-${L.fullDesc} chars (now ${d.fullDesc?.length ?? 0})`);
  if (!['in', 'out'].includes(d.location)) at('location must be in/out');
  if (!config.durations.includes(d.duration)) at(`duration must be ${config.durations.join('/')}`);
  if (!Array.isArray(d.ageGroups) || !d.ageGroups.length || d.ageGroups.some((a) => !config.ageGroups.includes(a))) at('ageGroups invalid');
  if (d.category !== undefined && !config.categories.includes(d.category)) at('category invalid');
  if (usedTitles.has(d.title?.toLowerCase())) at('an idea with this title already exists');
  usedTitles.add(d.title?.toLowerCase());
  let slug = slugify(d.title ?? '') || `idea-${counter}`;
  while (usedSlugs.has(slug)) slug = `${slug}-${counter}`;
  usedSlugs.add(slug);
  plan.push({ draft: d, slug, id: `task_${String(counter++).padStart(3, '0')}` });
}

if (errors.length) { console.error(errors.map((e) => `✖ ${e}`).join('\n')); console.error(`\n${errors.length} problem(s). Fix content/drafts/ideas-uk.json and run again.`); process.exit(1); }
console.log(`${plan.length} idea(s) ready to import (${drafts.length - plan.length} skipped).`);
if (!write) { console.log('Dry run. Add --write to create content/ideas/*.json (status "draft").'); process.exit(0); }
const today = new Date().toISOString().slice(0, 10);
for (const { draft: d, slug, id } of plan) {
  const path = join(IDEAS_DIR, `${slug}.json`);
  if (existsSync(path)) { console.warn(`! ${slug}.json exists, skipped`); continue; }
  writeFileSync(path, `${JSON.stringify({
    id, slug, status: 'draft', addedAt: today, location: d.location, duration: d.duration, ageGroups: d.ageGroups,
    ...(d.category ? { category: d.category } : {}), tags: d.tags ?? [],
    ...(d.inspiration ? { inspiration: d.inspiration } : {}),
    ...(d.list ? { list: d.list } : {}),
    ...(d.topic ? { topic: d.topic } : {}),
    text: { ua: { title: d.title, shortDesc: d.shortDesc, fullDesc: d.fullDesc } },
  }, null, 2)}\n`);
}
console.log(`Created ${plan.length} file(s) in content/ideas/. They are drafts: set "status": "published" and add the English text when ready.`);
