// Runs after `ng build`: fills the public site URL into index.html / robots.txt / sitemap.xml.
// Usage: SITE_URL=https://your-domain.example npm run build
// Without SITE_URL the absolute-URL tags (canonical, og:url, og:image, hreflang, sitemap) are removed
// so nothing points at a placeholder.
import { readFileSync, writeFileSync, existsSync } from 'node:fs';

import { generateSeoPages } from './seo-pages.mjs';

const OUT = 'www';
const site = (process.env.SITE_URL ?? '').replace(/\/+$/, '');
const TOKEN = '__SITE_URL__';

function patch(file, strip) {
  const path = `${OUT}/${file}`;
  if (!existsSync(path)) return;
  let text = readFileSync(path, 'utf8');
  text = site ? text.replaceAll(TOKEN, site) : strip(text);
  writeFileSync(path, text);
}

const generated_langs = () => ['en', 'uk', 'pl', 'es', 'de', 'fr'];
const dropLines = (text) => text.split('\n').filter((line) => !line.includes(TOKEN)).join('\n');
// JSON-LD: remove the url property line and its trailing comma on the previous line
const dropJsonLdUrl = (text) => text.replace(/,\s*\n\s*"url": "__SITE_URL__\/"/, '');

patch('index.html', (t) => dropLines(dropJsonLdUrl(t)));
if (site) {
  const path = `${OUT}/index.html`;
  const alternates = generated_langs().map((c) => `<link rel="alternate" hreflang="${c}" href="${site}/${c}/">`).join('\n    ');
  writeFileSync(path, readFileSync(path, 'utf8').replace('<link rel="alternate" hreflang="x-default"', `${alternates}\n    <link rel="alternate" hreflang="x-default"`));
}
patch('robots.txt', dropLines);
const generated = generateSeoPages({ out: OUT, src: 'src', site });
console.log(`[seo] Generated ${generated.pages} static pages (${generated.languages.join(', ')}).`);

if (!site) {
  // a sitemap without absolute URLs is invalid, so don't ship it
  console.warn('[seo] SITE_URL is not set: canonical, og:url/image, hreflang and sitemap.xml were removed from the build.');
  try { (await import('node:fs')).rmSync(`${OUT}/sitemap.xml`); } catch { /* not present */ }
} else {
  patch('sitemap.xml', (t) => t);
  console.log(`[seo] Using ${site}`);
}
