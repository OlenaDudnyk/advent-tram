// Content pipeline for ideas: one JSON file per idea in content/ideas/ is the single source of truth.
//   loadIdeas()   reads + parses every idea file
//   validate()    checks the schema and translation coverage
//   buildData()   writes the app's data files (src/assets/data/tasks.json + tasks.<lang>.json)
// See docs/CONTENT.md for the workflow.
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

export const ROOT = new URL('..', import.meta.url).pathname.replace(/\/$/, '');
export const IDEAS_DIR = join(ROOT, 'content/ideas');
export const DATA_DIR = join(ROOT, 'src/assets/data');
export const ASSETS_DIR = join(ROOT, 'src/assets');
export const config = JSON.parse(readFileSync(join(ROOT, 'content/config.json'), 'utf8'));

/** Languages other than English; English is the source text and always required. */
export const TRANSLATED = config.languages.filter((l) => l !== 'en');
const TEXT_FIELDS = ['title', 'shortDesc', 'fullDesc'];
const ID_RE = /^task_\d{3,}$/;
const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export const slugify = (s) => s.toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '')
  .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

/** Reads every content/ideas/*.json (sorted by id). Parse errors are reported by validate(). */
export function loadIdeas() {
  if (!existsSync(IDEAS_DIR)) return [];
  return readdirSync(IDEAS_DIR).filter((f) => f.endsWith('.json')).sort().map((file) => {
    const path = join(IDEAS_DIR, file);
    try {
      return { file, path, data: JSON.parse(readFileSync(path, 'utf8')) };
    } catch (error) {
      return { file, path, data: null, parseError: String(error.message ?? error) };
    }
  }).sort((a, b) => String(a.data?.id ?? a.file).localeCompare(String(b.data?.id ?? b.file)));
}

export const isPublished = (idea) => (idea.data.status ?? 'published') === 'published';

/** True when the language has all three text fields for the idea. */
export function hasText(idea, lang) {
  const t = idea.data.text?.[lang];
  return !!t && TEXT_FIELDS.every((f) => typeof t[f] === 'string' && t[f].trim());
}

/** @returns {{errors: string[], warnings: string[], coverage: Record<string, number>}} */
export function validate(ideas = loadIdeas()) {
  const errors = [];
  const warnings = [];
  const ids = new Map();
  const slugs = new Map();
  const L = config.limits;

  for (const { file, data, parseError } of ideas) {
    const at = (msg) => `${file}: ${msg}`;
    if (!data) { errors.push(at(`invalid JSON (${parseError})`)); continue; }
    if (typeof data.id !== 'string' || !ID_RE.test(data.id)) errors.push(at(`"id" must look like task_001 (got ${JSON.stringify(data.id)})`));
    else if (ids.has(data.id)) errors.push(at(`duplicate id ${data.id} (also in ${ids.get(data.id)})`)); else ids.set(data.id, file);
    if (typeof data.slug !== 'string' || !SLUG_RE.test(data.slug)) errors.push(at('"slug" must be lowercase-with-dashes'));
    else {
      if (slugs.has(data.slug)) errors.push(at(`duplicate slug ${data.slug} (also in ${slugs.get(data.slug)})`)); else slugs.set(data.slug, file);
      if (file !== `${data.slug}.json`) errors.push(at(`file name must be ${data.slug}.json`));
    }
    if (data.status !== undefined && !['draft', 'published'].includes(data.status)) errors.push(at('"status" must be draft or published'));
    if (data.addedAt !== undefined && !/^\d{4}-\d{2}-\d{2}$/.test(data.addedAt)) errors.push(at('"addedAt" must be YYYY-MM-DD'));
    if (!['in', 'out'].includes(data.location)) errors.push(at('"location" must be "in" or "out"'));
    if (!config.durations.includes(data.duration)) errors.push(at(`"duration" must be one of ${config.durations.join(', ')}`));
    if (!Array.isArray(data.ageGroups) || !data.ageGroups.length || data.ageGroups.some((a) => !config.ageGroups.includes(a))) {
      errors.push(at(`"ageGroups" must be a non-empty list from ${config.ageGroups.join(', ')}`));
    }
    if (data.category !== undefined && !config.categories.includes(data.category)) errors.push(at(`"category" must be one of ${config.categories.join(', ')}`));
    if (data.tags !== undefined && (!Array.isArray(data.tags) || data.tags.some((t) => typeof t !== 'string' || !SLUG_RE.test(t)))) errors.push(at('"tags" must be lowercase-with-dashes strings'));
    if (data.image !== undefined && !existsSync(join(ASSETS_DIR, data.image))) errors.push(at(`"image" ${data.image} not found in src/assets`));
    if (data.inspiration !== undefined) {
      try {
        const url = new URL(data.inspiration.url);
        const ok = config.allowedInspirationHosts.some((h) => url.hostname === h || url.hostname.endsWith(`.${h}`));
        if (url.protocol !== 'https:') errors.push(at('inspiration.url must be https'));
        if (!ok) errors.push(at(`inspiration host ${url.hostname} is not in allowedInspirationHosts (content/config.json)`));
      } catch { errors.push(at('inspiration.url is not a valid URL')); }
      if (data.inspiration.type !== undefined && !['pinterest', 'youtube', 'link'].includes(data.inspiration.type)) errors.push(at('inspiration.type must be pinterest, youtube or link'));
    }

    const text = data.text;
    if (!text || typeof text !== 'object') { errors.push(at('"text" with at least "en" is required')); continue; }
    for (const lang of Object.keys(text)) if (!config.languages.includes(lang)) errors.push(at(`unknown language "${lang}" in text`));
    for (const lang of config.languages) {
      const t = text[lang];
      if (!t) continue;
      for (const f of TEXT_FIELDS) {
        const v = t[f];
        if (typeof v !== 'string' || !v.trim()) { errors.push(at(`text.${lang}.${f} is missing`)); continue; }
        const max = L[f];
        if (v.length > max) errors.push(at(`text.${lang}.${f} is ${v.length} chars (max ${max})`));
        if (f === 'fullDesc' && v.length < L.fullDescMin) errors.push(at(`text.${lang}.fullDesc is too short (min ${L.fullDescMin})`));
        if (/\s{2,}|^\s|\s$/.test(v)) warnings.push(at(`text.${lang}.${f} has extra whitespace`));
      }
    }
    if (!text.en) errors.push(at('text.en (source language) is required'));
  }

  const published = ideas.filter((i) => i.data && isPublished(i));
  const coverage = Object.fromEntries(config.languages.map((l) => [l, published.filter((i) => hasText(i, l)).length]));
  for (const lang of TRANSLATED) {
    const missing = published.filter((i) => !hasText(i, lang)).map((i) => i.data.id);
    if (missing.length) warnings.push(`missing ${lang} translation for ${missing.length} idea(s): ${missing.slice(0, 8).join(', ')}${missing.length > 8 ? ', …' : ''}`);
  }
  return { errors, warnings, coverage, published: published.length, total: ideas.length };
}

/** App data files: src/assets/data/tasks.json (English base) + tasks.<lang>.json (id -> texts). */
export function buildData(ideas = loadIdeas()) {
  const published = ideas.filter((i) => i.data && isPublished(i));
  const tasks = published.map(({ data }) => ({
    id: data.id,
    title: data.text.en.title,
    shortDesc: data.text.en.shortDesc,
    fullDesc: data.text.en.fullDesc,
    location: data.location,
    duration: data.duration,
    ageGroups: data.ageGroups,
    ...(data.image ? { image: data.image } : {}),
    ...(data.category ? { category: data.category } : {}),
    ...(data.tags?.length ? { tags: data.tags } : {}),
    ...(data.inspiration ? { inspirationUrl: data.inspiration.url, ...(data.inspiration.type ? { inspirationType: data.inspiration.type } : {}) } : {}),
  }));
  mkdirSync(DATA_DIR, { recursive: true });
  writeFileSync(join(DATA_DIR, 'tasks.json'), `${JSON.stringify(tasks)}\n`);
  const written = { en: tasks.length };
  for (const lang of TRANSLATED) {
    const map = {};
    for (const idea of published) {
      if (hasText(idea, lang)) {
        const t = idea.data.text[lang];
        map[idea.data.id] = { title: t.title, shortDesc: t.shortDesc, fullDesc: t.fullDesc };
      }
    }
    writeFileSync(join(DATA_DIR, `tasks.${lang}.json`), `${JSON.stringify(map)}\n`);
    written[lang] = Object.keys(map).length;
  }
  return written;
}

export function nextId(ideas = loadIdeas()) {
  const max = ideas.reduce((m, i) => Math.max(m, Number(String(i.data?.id ?? '').replace('task_', '')) || 0), 0);
  return `task_${String(max + 1).padStart(3, '0')}`;
}
