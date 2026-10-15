// 构建产物冒烟检查：按 src/content/dialects/*.yaml 的实际内容核对 dist，换内容不用改这里。用法：npm run build && npm run verify
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parse } from 'yaml';

const dist = join(process.cwd(), 'dist');
const contentDir = join(process.cwd(), 'src/content/dialects');
const read = (p) => readFileSync(join(dist, p), 'utf8');
const failures = [];
const check = (ok, msg) => { if (!ok) failures.push(msg); };

const dialects = readdirSync(contentDir)
  .filter((f) => f.endsWith('.yaml'))
  .map((f) => ({ id: f.replace(/\.yaml$/, ''), ...parse(readFileSync(join(contentDir, f), 'utf8')) }));
const live = dialects.filter((d) => d.status === 'live');
const soon = dialects.filter((d) => d.status !== 'live');
const entryCount = live.reduce((n, d) => n + (d.entries ?? []).length, 0);

const prefixes = { 'zh-hans': '', 'zh-hant': 'zh-hant/', en: 'en/' };
const htmlLang = { 'zh-hans': 'zh-Hans', 'zh-hant': 'zh-Hant', en: 'en' };

const mustExist = [
  'search/zh-hans.json', 'search/zh-hant.json', 'search/en.json',
  'sitemap-index.xml', 'robots.txt', '404.html', '_headers', 'og.png', 'favicon.svg',
];
for (const p of Object.values(prefixes)) {
  mustExist.push(`${p}index.html`);
  for (const d of live) {
    mustExist.push(`${p}${d.id}/index.html`);
    for (const e of d.entries) mustExist.push(`${p}${d.id}/${e.id}/index.html`);
  }
}
for (const p of mustExist) check(existsSync(join(dist, p)), `missing dist/${p}`);

for (const d of soon) check(!existsSync(join(dist, d.id)), `soon dialect "${d.id}" should not have pages`);

if (failures.length === 0) {
  for (const [lang, p] of Object.entries(prefixes)) {
    check(read(`${p}index.html`).includes(`lang="${htmlLang[lang]}"`), `${p}index.html should have lang="${htmlLang[lang]}"`);
  }

  const home = read('index.html');
  check(!home.includes('按场景查'), 'home should not have the scene section');
  check(!home.includes('听懂家里长辈说的话'), 'home should not have the eyebrow line');
  check(!/<button[^>]*type="submit"/.test(home), 'home search should have no submit button');
  const cards = (home.match(/class="dialect-card( [^"]*)?"/g) ?? []).length;
  check(cards === live.length, `home should render ${live.length} live dialect cards, got ${cards}`);
  for (const d of soon) check(home.includes(d.name), `home should still list coming-soon dialect ${d.name}`);

  // 选填内容没写时，词条页不应出现对应的区块（标签文字见 src/i18n/ui.ts）
  const optional = [
    ['例句', (e) => e.examples?.length],
    ['各地说法', (e) => e.variants?.length],
    ['使用提示', (e) => e.note],
    ['字面意思', (e) => e.literal],
    ['谐音（近似）', (e) => e.homophone],
    ['English 读法', (e) => e.enReading],
  ];
  for (const d of live) {
    for (const e of d.entries) {
      const page = `${d.id}/${e.id}/index.html`;
      const html = read(page);
      check(html.includes('DefinedTerm'), `${page} should have DefinedTerm JSON-LD`);
      check(html.includes('rel="canonical"'), `${page} should have canonical`);
      check(html.includes('hreflang="zh-Hant"'), `${page} should have hreflang alternates`);
      for (const [label, has] of optional) {
        if (!has(e)) check(!html.includes(label), `${page} has no data for "${label}" but renders it`);
      }
      if (e.variants?.some((v) => !v.text)) check(html.includes('[待母语者确认]'), `${page} should show placeholder for empty variants`);

      const hant = read(`zh-hant/${page}`);
      check(new RegExp(`<h1[^>]*>${e.text}</h1>`).test(hant), `zh-hant/${page} headword must stay unconverted (${e.text})`);
    }
  }

  const liveIds = new Set(live.map((d) => d.id));
  for (const lang of Object.keys(prefixes)) {
    const index = JSON.parse(read(`search/${lang}.json`));
    check(index.length === entryCount, `search/${lang}.json should have ${entryCount} entries, got ${index.length}`);
    check(index.every((r) => liveIds.has(r.dialect)), `search/${lang}.json should only contain live dialects`);
  }

  const sitemap = read('sitemap-0.xml');
  for (const d of live) {
    for (const e of d.entries) {
      for (const p of Object.values(prefixes)) check(sitemap.includes(`/${p}${d.id}/${e.id}/`), `sitemap should list /${p}${d.id}/${e.id}/`);
    }
  }
  check(!sitemap.includes('/404'), 'sitemap should not list 404');
  for (const d of soon) check(!sitemap.includes(`/${d.id}/`), `sitemap should not list soon dialect ${d.id}`);
}

if (failures.length) {
  console.error(`verify failed:\n- ${failures.join('\n- ')}`);
  process.exit(1);
}
console.log(`verify: dist looks good (${live.length} live dialects, ${entryCount} entries, ${soon.length} coming soon)`);
