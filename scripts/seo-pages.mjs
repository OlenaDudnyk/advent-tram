// Generates static, crawlable pages for the public site layer (run from finalize-seo.mjs after `ng build`):
//   /{lang}/                 language landing page with all ideas
//   /{lang}/ideas/{slug}/    one page per idea
// 6 languages × (1 + N ideas) pages, each with title/description, canonical + hreflang (when SITE_URL is set),
// Open Graph and JSON-LD. Pure HTML + inline CSS, no JavaScript, so they are fast and indexable.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';

import { config, hasText, isPublished, loadIdeas } from './content-lib.mjs';

const LANGS = [
  { code: 'en', app: 'en', locale: 'en_GB', name: 'English' },
  { code: 'uk', app: 'ua', locale: 'uk_UA', name: 'Українська' },
  { code: 'pl', app: 'pl', locale: 'pl_PL', name: 'Polski' },
  { code: 'es', app: 'es', locale: 'es_ES', name: 'Español' },
  { code: 'de', app: 'de', locale: 'de_DE', name: 'Deutsch' },
  { code: 'fr', app: 'fr', locale: 'fr_FR', name: 'Français' },
];

const UI = {
  en: { more: 'More ideas', cta: 'Open Advent Tram', ctaHint: 'Plan this idea in your family Advent calendar.', all: 'All ideas', time: 'Time', where: 'Where', home: 'At home', out: 'Outdoors', min: 'min', title: 'Advent ideas for families', intro: 'Small, cozy ideas for every day of Advent: baking, crafts, walks and quiet moments together.', age: 'For' },
  uk: { more: 'Більше ідей', cta: 'Відкрити Advent Tram', ctaHint: 'Заплануйте цю ідею в сімейному адвент-календарі.', all: 'Усі ідеї', time: 'Час', where: 'Де', home: 'Вдома', out: 'Надворі', min: 'хв', title: 'Ідеї на адвент для родини', intro: 'Маленькі затишні ідеї на кожен день адвенту: випічка, творчість, прогулянки й тихі миті разом.', age: 'Для' },
  pl: { more: 'Więcej pomysłów', cta: 'Otwórz Advent Tram', ctaHint: 'Zaplanuj ten pomysł w rodzinnym kalendarzu adwentowym.', all: 'Wszystkie pomysły', time: 'Czas', where: 'Gdzie', home: 'W domu', out: 'Na zewnątrz', min: 'min', title: 'Pomysły na adwent dla rodzin', intro: 'Małe, przytulne pomysły na każdy dzień adwentu: pieczenie, prace plastyczne, spacery i cichy czas razem.', age: 'Dla' },
  es: { more: 'Más ideas', cta: 'Abrir Advent Tram', ctaHint: 'Programa esta idea en tu calendario de Adviento en familia.', all: 'Todas las ideas', time: 'Tiempo', where: 'Dónde', home: 'En casa', out: 'Al aire libre', min: 'min', title: 'Ideas de Adviento para familias', intro: 'Pequeñas ideas acogedoras para cada día de Adviento: repostería, manualidades, paseos y momentos tranquilos juntos.', age: 'Para' },
  de: { more: 'Mehr Ideen', cta: 'Advent Tram öffnen', ctaHint: 'Plane diese Idee in eurem Familien-Adventskalender.', all: 'Alle Ideen', time: 'Dauer', where: 'Wo', home: 'Zu Hause', out: 'Draußen', min: 'Min.', title: 'Adventsideen für Familien', intro: 'Kleine, gemütliche Ideen für jeden Tag im Advent: Backen, Basteln, Spaziergänge und ruhige Momente zusammen.', age: 'Für' },
  fr: { more: "Plus d'idées", cta: 'Ouvrir Advent Tram', ctaHint: "Planifiez cette idée dans votre calendrier de l'Avent en famille.", all: 'Toutes les idées', time: 'Durée', where: 'Où', home: 'À la maison', out: 'Dehors', min: 'min', title: "Idées de l'Avent pour les familles", intro: "De petites idées chaleureuses pour chaque jour de l'Avent : pâtisserie, bricolage, promenades et moments calmes ensemble.", age: 'Pour' },
};

const AGE = {
  en: { kids_3_6: 'Kids 3-6', kids_7_12: 'Kids 7-12', adults: 'Adults', family: 'Whole Family' },
  uk: { kids_3_6: 'Діти 3-6', kids_7_12: 'Діти 7-12', adults: 'Дорослі', family: 'Вся родина' },
  pl: { kids_3_6: 'Dzieci 3-6', kids_7_12: 'Dzieci 7-12', adults: 'Dorośli', family: 'Cała rodzina' },
  es: { kids_3_6: 'Niños 3-6', kids_7_12: 'Niños 7-12', adults: 'Adultos', family: 'Toda la familia' },
  de: { kids_3_6: 'Kinder 3-6', kids_7_12: 'Kinder 7-12', adults: 'Erwachsene', family: 'Ganze Familie' },
  fr: { kids_3_6: 'Enfants 3-6', kids_7_12: 'Enfants 7-12', adults: 'Adultes', family: 'Toute la famille' },
};

const artFor = (idea) => `/assets/${idea.image ?? (idea.location === 'out' ? 'idea-winter.svg' : 'gifts.svg')}`;
const PAGE_SIZE = config.pageSize ?? 24;

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const slugify = (s) => s.toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

/** seo.title / seo.description of the app, per language code. */
function seoStrings(srcDir) {
  const out = {};
  for (const l of LANGS) {
    const text = readFileSync(`${srcDir}/app/core/i18n/${l.app}.ts`, 'utf8');
    const grab = (key) => {
      const m = text.match(new RegExp(`'${key.replace('.', '\\.')}':\\s*(?:"((?:[^"\\\\]|\\\\.)*)"|'((?:[^'\\\\]|\\\\.)*)')`));
      return (m[1] ?? m[2]).replace(/\\(["'\\])/g, '$1');
    };
    out[l.code] = { title: grab('seo.title'), description: grab('seo.description') };
  }
  return out;
}

const CSS = `*{box-sizing:border-box}body{margin:0;background:#8b1e24;color:#2f2622;font:16px/1.6 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif}
a{color:#7a1c2e}main{max-width:760px;margin:24px auto;padding:28px 24px 32px;background:#f7f0ec;border-radius:32px}
header.top{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;margin-bottom:8px}
.brand{font-weight:700;font-size:20px;text-decoration:none;color:#7a1c2e}.langs{display:flex;gap:8px;flex-wrap:wrap;font-size:14px}.langs a,.langs strong{padding:4px 10px;border-radius:14px;background:#ebe2dc;text-decoration:none;color:#2f2622}.langs strong{background:#1b4332;color:#fff}
h1{font-size:32px;line-height:1.15;margin:16px 0 8px;letter-spacing:-.4px}h2{font-size:22px;margin:24px 0 8px}p.lead{color:#5b4f48;font-size:18px;margin:0 0 20px}
img.art{width:100%;max-height:320px;object-fit:cover;border-radius:24px;background:#ebe2dc}
dl{display:grid;grid-template-columns:auto 1fr;gap:6px 16px;margin:16px 0;padding:14px 18px;border-radius:20px;background:#ebe2dc}dt{color:#5b4f48;font-weight:600}dd{margin:0}
.cta{display:inline-block;margin:12px 0 4px;padding:14px 28px;border-radius:26px;background:#7a1c2e;color:#f7f0ec;font-weight:700;text-decoration:none}
.hint{color:#5b4f48;font-size:14px;margin:6px 0 0}ul.ideas{list-style:none;margin:20px 0 0;padding:0;display:grid;gap:12px}
ul.ideas a{display:flex;gap:14px;align-items:center;padding:12px;border-radius:22px;background:#ebe2dc;text-decoration:none;color:#2f2622}
ul.ideas img{width:72px;height:72px;border-radius:16px;object-fit:cover;flex:none}ul.ideas strong{display:block}ul.ideas span{color:#5b4f48;font-size:14px}
nav.crumbs{font-size:14px;margin-top:20px}.credit{margin:6px 4px 0;color:#6b5f58;font-size:12px}nav.pager{display:flex;gap:16px;justify-content:center;align-items:center;margin-top:20px}nav.pager a{padding:8px 16px;border-radius:18px;background:#ebe2dc;text-decoration:none}`;

function layout({ lang, site, path, title, description, body, jsonLd, alternates, availableLangs = LANGS.map((l) => l.code), robots = 'index,follow' }) {
  const abs = (p) => (site ? `${site}${p}` : null);
  const canonical = abs(path);
  const alt = alternates && site
    ? [...alternates.map((a) => `<link rel="alternate" hreflang="${a.code}" href="${site}${a.path}">`),
       `<link rel="alternate" hreflang="x-default" href="${site}${alternates[0].path}">`].join('\n')
    : '';
  return `<!doctype html>
<html lang="${lang.code}">
<head>
<meta charset="utf-8">
<title>${esc(title)}</title>
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="description" content="${esc(description)}">
<meta name="robots" content="${robots}">
<meta name="theme-color" content="#8b1e24">
<link rel="icon" type="image/png" href="/assets/icon/favicon.png">
${canonical ? `<link rel="canonical" href="${canonical}">` : ''}
${alt}
<meta property="og:type" content="article">
<meta property="og:site_name" content="Advent Tram">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:locale" content="${lang.locale}">
${canonical ? `<meta property="og:url" content="${canonical}">` : ''}
${site ? `<meta property="og:image" content="${site}/og-image.jpg">` : ''}
<meta name="twitter:card" content="summary_large_image">
${jsonLd ? `<script type="application/ld+json">${JSON.stringify(jsonLd)}</script>` : ''}
<style>${CSS}</style>
</head>
<body>
<main>
<header class="top"><a class="brand" href="/${lang.code}/">Advent Tram</a><nav class="langs" aria-label="Language">${
    LANGS.filter((l) => availableLangs.includes(l.code)).map((l) => (l.code === lang.code ? `<strong>${l.code.toUpperCase()}</strong>` : `<a href="${alternates ? alternates.find((a) => a.code === l.code).path : `/${l.code}/`}" hreflang="${l.code}" lang="${l.code}">${l.code.toUpperCase()}</a>`)).join('')
  }</nav></header>
${body}
</main>
</body>
</html>
`;
}

export function generateSeoPages({ out, src, site }) {
  const ideas = loadIdeas().filter((i) => i.data && isPublished(i)).map((i) => ({ ...i.data, _idea: i }));
  const seo = seoStrings(src);
  const textOf = (idea, lang) => idea.text[lang.app];
  /** Ideas that have a complete text in this language (English always). */
  const forLang = (lang) => ideas.filter((idea) => hasText(idea._idea, lang.app));
  const urls = new Map(LANGS.map((l) => [l.code, []]));
  let pages = 0;

  /** The language versions that exist for an idea (for hreflang). */
  const versions = (idea) => LANGS.filter((l) => hasText(idea._idea, l.app)).map((l) => ({ code: l.code, path: `/${l.code}/ideas/${idea.slug}/` }));
  const landingPath = (lang, page = 1) => (page === 1 ? `/${lang.code}/` : `/${lang.code}/page/${page}/`);
  const landingCount = (lang) => Math.max(1, Math.ceil(forLang(lang).length / PAGE_SIZE));

  for (const lang of LANGS) {
    const ui = UI[lang.code];
    const ageLabels = AGE[lang.code];
    const mine = forLang(lang);
    if (!mine.length) continue;
    const total = landingCount(lang);

    // landing pages, paginated
    for (let page = 1; page <= total; page++) {
      const slice = mine.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
      const list = slice.map((idea) => {
        const x = textOf(idea, lang);
        return `<li><a href="/${lang.code}/ideas/${idea.slug}/"><img src="${artFor(idea)}" alt="" width="72" height="72" loading="lazy"><div><strong>${esc(x.title)}</strong><span>${esc(x.shortDesc)}</span></div></a></li>`;
      }).join('\n');
      const pager = total > 1
        ? `<nav class="pager" aria-label="Pages">${page > 1 ? `<a href="${landingPath(lang, page - 1)}" rel="prev">←</a>` : ''}<span>${page} / ${total}</span>${page < total ? `<a href="${landingPath(lang, page + 1)}" rel="next">→</a>` : ''}</nav>`
        : '';
      const itemList = {
        '@context': 'https://schema.org', '@type': 'ItemList', name: ui.title, inLanguage: lang.code,
        itemListElement: slice.map((idea, i) => ({ '@type': 'ListItem', position: (page - 1) * PAGE_SIZE + i + 1, name: textOf(idea, lang).title, ...(site ? { url: `${site}/${lang.code}/ideas/${idea.slug}/` } : {}) })),
      };
      const alternates = page === 1 ? LANGS.filter((l) => forLang(l).length).map((l) => ({ code: l.code, path: landingPath(l) })) : null;
      const html = layout({
        lang, site, path: landingPath(lang, page), title: page === 1 ? seo[lang.code].title : `${seo[lang.code].title} (${page}/${total})`,
        description: seo[lang.code].description, alternates, jsonLd: itemList,
        body: `<h1>${esc(ui.title)}</h1><p class="lead">${esc(ui.intro)}</p>${page === 1 ? `<a class="cta" href="/">${esc(ui.cta)}</a>` : ''}<ul class="ideas">\n${list}\n</ul>${pager}`,
        availableLangs: LANGS.filter((l) => forLang(l).length).map((l) => l.code),
      });
      mkdirSync(`${out}${landingPath(lang, page)}`, { recursive: true });
      writeFileSync(`${out}${landingPath(lang, page)}index.html`, html);
      urls.get(lang.code).push({ path: landingPath(lang, page), alternates: alternates ?? undefined, priority: page === 1 ? '0.9' : '0.6' });
      pages++;
    }

    // idea pages
    for (const [index, idea] of mine.entries()) {
      const x = textOf(idea, lang);
      const path = `/${lang.code}/ideas/${idea.slug}/`;
      const alternates = versions(idea);
      const image = artFor(idea);
      const ages = idea.ageGroups.map((a) => ageLabels[a]).join(', ');
      // internal links: the next ideas with the same place (stable, wraps around)
      const related = [];
      for (let step = 1; step < mine.length && related.length < 4; step++) {
        const other = mine[(index + step) % mine.length];
        if (other.location === idea.location) related.push(other);
      }
      const relatedHtml = related.length
        ? `<h2>${esc(ui.more)}</h2><ul class="ideas">${related.map((o) => `<li><a href="/${lang.code}/ideas/${o.slug}/"><img src="${artFor(o)}" alt="" width="72" height="72" loading="lazy"><div><strong>${esc(textOf(o, lang).title)}</strong><span>${esc(textOf(o, lang).shortDesc)}</span></div></a></li>`).join('')}</ul>`
        : '';
      const jsonLd = {
        '@context': 'https://schema.org', '@type': 'Article', headline: x.title, description: x.shortDesc, inLanguage: lang.code,
        articleBody: x.fullDesc, timeRequired: `PT${idea.duration}M`,
        image: site ? `${site}/og-image.jpg` : '/og-image.jpg',
        ...(idea.addedAt ? { datePublished: idea.addedAt } : {}),
        author: { '@type': 'Organization', name: 'Advent Tram' }, publisher: { '@type': 'Organization', name: 'Advent Tram' },
        ...(site ? { mainEntityOfPage: `${site}${path}` } : {}),
      };
      const html = layout({
        lang, site, path, title: `${x.title} — Advent Tram`, description: `${x.shortDesc}. ${x.fullDesc}`.slice(0, 155).replace(/\s+\S*$/, '…'),
        alternates, jsonLd, availableLangs: alternates.map((a) => a.code),
        body: `<nav class="crumbs"><a href="${landingPath(lang)}">${esc(ui.all)}</a></nav>
<h1>${esc(x.title)}</h1><p class="lead">${esc(x.shortDesc)}</p>
<img class="art" src="${image}" alt="${esc(x.title)}" width="720" height="320">
${idea.photo ? `<p class="credit">Photo: <a href="${esc(idea.photo.url)}?utm_source=advent_tram&amp;utm_medium=referral" rel="noopener">${esc(idea.photo.author)}</a> / <a href="https://unsplash.com/?utm_source=advent_tram&amp;utm_medium=referral" rel="noopener">Unsplash</a></p>` : ''}
<p>${esc(x.fullDesc)}</p>
<dl><dt>${esc(ui.time)}</dt><dd>${idea.duration} ${esc(ui.min)}</dd><dt>${esc(ui.where)}</dt><dd>${esc(idea.location === 'in' ? ui.home : ui.out)}</dd><dt>${esc(ui.age)}</dt><dd>${esc(ages)}</dd></dl>
<a class="cta" href="/">${esc(ui.cta)}</a><p class="hint">${esc(ui.ctaHint)}</p>
${relatedHtml}`,
      });
      mkdirSync(`${out}${path}`, { recursive: true });
      writeFileSync(`${out}${path}index.html`, html);
      urls.get(lang.code).push({ path, alternates, priority: '0.7', lastmod: idea.addedAt });
      pages++;
    }
  }

  // sitemaps (absolute URLs required): one per language + one for the app, tied together by a sitemap index
  const sitemaps = [];
  if (site) {
    const head = '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n';
    const entry = (u) => `  <url>\n    <loc>${site}${u.path}</loc>\n${u.lastmod ? `    <lastmod>${u.lastmod}</lastmod>\n` : ''}${(u.alternates ?? []).map((a) => `    <xhtml:link rel="alternate" hreflang="${a.code}" href="${site}${a.path}"/>`).join('\n')}${u.alternates?.length ? '\n' : ''}    <priority>${u.priority}</priority>\n  </url>`;
    const write = (name, list) => {
      writeFileSync(`${out}/${name}`, `${head}${list.map(entry).join('\n')}\n</urlset>\n`);
      sitemaps.push(name);
    };
    write('sitemap-app.xml', [{ path: '/', priority: '1.0' }, { path: '/privacy', priority: '0.3' }]);
    for (const [code, list] of urls) if (list.length) write(`sitemap-${code}.xml`, list);
    writeFileSync(`${out}/sitemap.xml`, `<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${sitemaps.map((n) => `  <sitemap><loc>${site}/${n}</loc></sitemap>`).join('\n')}\n</sitemapindex>\n`);
  }
  return { pages, languages: LANGS.filter((l) => forLang(l).length).map((l) => l.code), sitemaps };
}
