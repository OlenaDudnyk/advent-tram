// Downloads the Unsplash photos listed in content/photos.json into src/assets/ideas/<slug>.jpg
// and links them to the ideas (image + photo credit).
//   content/photos.json: { "task_001": { "photoId": "abc123XYZ", "author": "Name", "pageUrl": "https://unsplash.com/photos/..." } }
// Usage: node scripts/import-photos.mjs [--width 900]
import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { ASSETS_DIR, ROOT, loadIdeas } from './content-lib.mjs';

const width = Number(process.argv[process.argv.indexOf('--width') + 1]) || 900;
const photos = JSON.parse(readFileSync(join(ROOT, 'content/photos.json'), 'utf8'));
const outDir = join(ASSETS_DIR, 'ideas');
mkdirSync(outDir, { recursive: true });

for (const idea of loadIdeas()) {
  const entry = photos[idea.data?.id];
  if (!entry) continue;
  const file = join(outDir, `${idea.data.slug}.jpg`);
  const res = await fetch(`https://unsplash.com/photos/${entry.photoId}/download?force=true&w=${width}`);
  if (!res.ok) { console.error(`✖ ${idea.data.id}: HTTP ${res.status} for ${entry.photoId}`); process.exitCode = 1; continue; }
  writeFileSync(file, Buffer.from(await res.arrayBuffer()));
  // keep files small: longest side <= width, JPEG quality ~75 (sips ships with macOS)
  try { execFileSync('sips', ['-Z', String(width), '-s', 'format', 'jpeg', '-s', 'formatOptions', '75', file, '--out', file], { stdio: 'ignore' }); } catch { /* sips not available: keep the downloaded file */ }
  idea.data.image = `ideas/${idea.data.slug}.jpg`;
  idea.data.photo = { id: entry.photoId, author: entry.author, url: entry.pageUrl };
  writeFileSync(idea.path, `${JSON.stringify(idea.data, null, 2)}\n`);
  console.log(`✓ ${idea.data.id} ${idea.data.slug}  ${(statSync(file).size / 1024).toFixed(0)} kB  (${entry.author})`);
}
