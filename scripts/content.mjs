#!/usr/bin/env node
// Idea content CLI. Usage (via npm scripts):
//   npm run content:check [-- --strict]   validate all ideas (strict: missing translations are errors)
//   npm run content:build                 write src/assets/data/tasks*.json from content/ideas/*.json
//   npm run idea:new -- "Title" [--location in|out] [--duration 15] [--age family,adults] [--image idea-craft.svg]
//   npm run content:todo -- --lang pl     export ideas still missing a translation to content/.todo/pl.json
//   npm run content:import -- --lang pl content/.todo/pl.json   merge translated texts back
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { ROOT, IDEAS_DIR, TRANSLATED, buildData, config, hasText, isPublished, loadIdeas, nextId, slugify, validate } from './content-lib.mjs';

const [, , command = 'help', ...rest] = process.argv;
const flags = {};
const positional = [];
for (let i = 0; i < rest.length; i++) {
  if (rest[i].startsWith('--')) {
    const key = rest[i].slice(2);
    const value = rest[i + 1] && !rest[i + 1].startsWith('--') ? rest[++i] : true;
    flags[key] = value;
  } else positional.push(rest[i]);
}

const writeIdea = (path, data) => writeFileSync(path, `${JSON.stringify(data, null, 2)}\n`);

function check({ quiet = false } = {}) {
  const result = validate();
  const strict = flags.strict || process.env.CONTENT_STRICT === '1';
  if (!quiet) {
    console.log(`Ideas: ${result.published} published of ${result.total}`);
    console.log(`Translation coverage: ${config.languages.map((l) => `${l} ${result.coverage[l]}/${result.published}`).join(' · ')}`);
  }
  for (const w of result.warnings) console.warn(`${strict && w.startsWith('missing') ? '✖' : '!'} ${w}`);
  for (const e of result.errors) console.error(`✖ ${e}`);
  const missing = strict && result.warnings.some((w) => w.startsWith('missing'));
  if (result.errors.length || missing) {
    console.error(`\nContent check failed (${result.errors.length} error(s)${missing ? ', missing translations in strict mode' : ''}).`);
    process.exit(1);
  }
  if (!quiet) console.log('Content check passed.');
}

switch (command) {
  case 'check':
    check();
    break;

  case 'build': {
    check({ quiet: true });
    const written = buildData();
    console.log(`[content] built ${Object.entries(written).map(([l, n]) => `${l}:${n}`).join(' ')}`);
    break;
  }

  case 'new': {
    const title = positional.join(' ').trim();
    if (!title) { console.error('Usage: npm run idea:new -- "English title" [--location in|out] [--duration 15] [--age family] [--image file.svg]'); process.exit(1); }
    const ideas = loadIdeas();
    const slug = slugify(title);
    const path = join(IDEAS_DIR, `${slug}.json`);
    if (existsSync(path)) { console.error(`Already exists: content/ideas/${slug}.json`); process.exit(1); }
    const data = {
      id: nextId(ideas),
      slug,
      status: 'draft',
      addedAt: new Date().toISOString().slice(0, 10),
      location: flags.location === 'out' ? 'out' : 'in',
      duration: Number(flags.duration) || 15,
      ageGroups: String(flags.age ?? 'family').split(',').map((a) => a.trim()),
      ...(flags.image ? { image: flags.image } : {}),
      tags: [],
      text: { en: { title, shortDesc: 'TODO short description', fullDesc: 'TODO: describe the idea in two or three warm sentences.' } },
    };
    mkdirSync(IDEAS_DIR, { recursive: true });
    writeIdea(path, data);
    console.log(`Created content/ideas/${slug}.json (${data.id}, status: draft).\nFill in the texts, set "status": "published", then run: npm run content:check`);
    break;
  }

  case 'todo': {
    const lang = String(flags.lang ?? '');
    if (!TRANSLATED.includes(lang)) { console.error(`Use --lang ${TRANSLATED.join('|')}`); process.exit(1); }
    const todo = {};
    for (const idea of loadIdeas()) {
      if (idea.data && isPublished(idea) && !hasText(idea, lang)) todo[idea.data.id] = { ...idea.data.text.en };
    }
    const dir = join(ROOT, 'content/.todo');
    mkdirSync(dir, { recursive: true });
    const out = join(dir, `${lang}.json`);
    writeFileSync(out, `${JSON.stringify(todo, null, 2)}\n`);
    console.log(`${Object.keys(todo).length} idea(s) need ${lang}. Translate the values in content/.todo/${lang}.json, then:\n  npm run content:import -- --lang ${lang} content/.todo/${lang}.json`);
    break;
  }

  case 'import': {
    const lang = String(flags.lang ?? '');
    const file = positional[0];
    if (!TRANSLATED.includes(lang) || !file) { console.error('Usage: npm run content:import -- --lang <code> <file.json>'); process.exit(1); }
    const incoming = JSON.parse(readFileSync(file, 'utf8'));
    const ideas = loadIdeas();
    let merged = 0;
    for (const [id, t] of Object.entries(incoming)) {
      const idea = ideas.find((i) => i.data?.id === id);
      if (!idea) { console.warn(`! unknown id ${id}, skipped`); continue; }
      idea.data.text[lang] = { title: t.title, shortDesc: t.shortDesc, fullDesc: t.fullDesc };
      writeIdea(idea.path, idea.data);
      merged++;
    }
    console.log(`Merged ${merged} translation(s) into content/ideas/. Running check…`);
    check();
    break;
  }

  default:
    console.log(readFileSync(new URL(import.meta.url).pathname, 'utf8').split('\n').slice(1, 9).map((l) => l.replace(/^\/\/ ?/, '')).join('\n'));
}
