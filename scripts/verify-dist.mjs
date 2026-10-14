// 构建产物冒烟检查（基于示例数据）。用法：npm run build && npm run verify
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const dist = join(process.cwd(), 'dist');
const read = (p) => readFileSync(join(dist, p), 'utf8');
const failures = [];
const check = (ok, msg) => { if (!ok) failures.push(msg); };

const mustExist = [
  'index.html', 'zh-hant/index.html', 'en/index.html',
  'minnan/index.html', 'cantonese/index.html', 'en/cantonese/index.html',
  'minnan/a-ma/index.html', 'zh-hant/minnan/a-ma/index.html', 'en/minnan/a-ma/index.html',
  'cantonese/sik-zo-faan-mei/index.html',
  'search/zh-hans.json', 'search/zh-hant.json', 'search/en.json',
  'sitemap-index.xml', 'robots.txt', '404.html', '_headers', 'og.png', 'favicon.svg',
];
for (const p of mustExist) check(existsSync(join(dist, p)), `missing dist/${p}`);

for (const id of ['hakka', 'teochew', 'shanghainese']) {
  check(!existsSync(join(dist, id)), `soon dialect "${id}" should not have pages`);
}

if (failures.length === 0) {
  const home = read('index.html');
  check(!home.includes('按场景查'), 'home should not have the scene section');
  check(!home.includes('听懂家里长辈说的话'), 'home should not have the eyebrow line');
  check(!/<button[^>]*type="submit"/.test(home), 'home search should have no submit button');
  check((home.match(/class="dialect-card( [^"]*)?"/g) ?? []).length === 2, 'home should render cards only for live dialects');
  check(home.includes('潮汕话') && home.includes('上海话'), 'home should still list coming-soon dialects');

  const hantList = read('zh-hant/minnan/index.html');
  check(hantList.includes('親屬稱謂'), 'zh-hant dialect page should show converted category names');
  check(hantList.includes('lang="zh-Hant"'), 'zh-hant page should have lang="zh-Hant"');

  const hantEntry = read('zh-hant/minnan/a-ma/index.html');
  check(/<h1[^>]*>阿嬷<\/h1>/.test(hantEntry), 'zh-hant entry headword must stay unconverted (阿嬷)');

  const minimal = read('minnan/to-sia/index.html');
  for (const word of ['例句', '各地说法', '使用提示', '字面意思']) {
    check(!minimal.includes(word), `minimal entry to-sia should not render "${word}"`);
  }

  const full = read('minnan/a-ma/index.html');
  check(full.includes('DefinedTerm'), 'entry page should have DefinedTerm JSON-LD');
  check(full.includes('rel="canonical"'), 'entry page should have canonical');
  check(full.includes('hreflang="zh-Hant"'), 'entry page should have hreflang alternates');
  check(full.includes('[待母语者确认]'), 'empty variant should show placeholder');

  check(read('en/minnan/a-ma/index.html').includes('Grandma (father'), 'en entry should show English meaning');

  const index = JSON.parse(read('search/en.json'));
  check(index.length === 12, `search index should have 12 entries, got ${index.length}`);
  check(index.every((r) => ['minnan', 'cantonese'].includes(r.dialect)), 'search index should only contain live dialects');

  const sitemap = read('sitemap-0.xml');
  check(sitemap.includes('/en/minnan/a-ma/'), 'sitemap should list English entry pages');
  check(!sitemap.includes('/404'), 'sitemap should not list 404');
  check(!sitemap.includes('/hakka/'), 'sitemap should not list soon dialects');
}

if (failures.length) {
  console.error(`verify failed:\n- ${failures.join('\n- ')}`);
  process.exit(1);
}
console.log('verify: dist looks good');
