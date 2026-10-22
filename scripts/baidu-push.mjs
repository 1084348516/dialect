// 把线上站点地图里的网址推送给百度站长平台（普通收录 → API 提交）。
// 新站每天额度很少，所以按重要程度排序，只推额度内的，推过的记在 .baidu-pushed.json，第二天再跑接着推。
// 用法：npm run baidu-push（token 写在项目根目录的 .env 里：BAIDU_TOKEN=xxx，该文件不进 git），或 BAIDU_TOKEN=xxx npm run baidu-push
import { readFile, readdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { parse } from 'yaml';
import { SITE, sitemapUrls } from './sitemap-urls.mjs';

const STATE_FILE = '.baidu-pushed.json';
const CONTENT_DIR = 'src/content/dialects';

/** 从 YAML 里认出哪些网址是分类页、哪些是首页热门词条（featured），键为“方言/分类”“方言/词条” */
async function pageKinds() {
  const categories = new Set();
  const featured = new Set();
  for (const f of (await readdir(CONTENT_DIR)).filter((f) => f.endsWith('.yaml'))) {
    const id = f.replace(/\.yaml$/, '');
    const d = parse(await readFile(join(CONTENT_DIR, f), 'utf8'));
    for (const c of d.categories ?? []) categories.add(`${id}/${c.id}`);
    for (const e of d.entries ?? []) if (e.featured) featured.add(`${id}/${e.id}`);
  }
  return { categories, featured };
}

// 百度主要服务中文搜索：简体优先，其次繁体，英文最后。同一语言里依次是首页、方言页、分类页、
// 首页热门词条、其他词条，说明页最后；分类页一页链到整类词条，比单个词条更值得先推
export function priority(url, kinds) {
  const path = new URL(url).pathname;
  const lang = path.startsWith('/en/') ? 2 : path.startsWith('/zh-hant/') ? 1 : 0;
  const rest = path.replace(/^\/(en|zh-hant)\//, '/').split('/').filter(Boolean);
  const key = rest.join('/');
  const rank =
    rest.length === 0 ? 0
    : ['about', 'privacy', 'contact'].includes(rest[0]) ? 5
    : rest.length === 1 ? 1
    : kinds.categories.has(key) ? 2
    : kinds.featured.has(key) ? 3
    : 4;
  return lang * 10 + rank;
}

async function push(endpoint, urls) {
  const res = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'text/plain' }, body: urls.join('\n') });
  return res.json();
}

async function main() {
  try {
    process.loadEnvFile();
  } catch {}
  const token = process.env.BAIDU_TOKEN;
  if (!token) {
    console.error('缺少 BAIDU_TOKEN：写进项目根目录的 .env（BAIDU_TOKEN=xxx），在百度站长平台 → 普通收录 → API 提交里找');
    process.exit(1);
  }
  // site 参数要原样传，编码后百度会报 site init fail
  const endpoint = `http://data.zz.baidu.com/urls?site=${SITE}&token=${encodeURIComponent(token)}`;

  let pushed = [];
  try {
    pushed = JSON.parse(await readFile(STATE_FILE, 'utf8'));
  } catch {}
  const done = new Set(pushed);
  const todo = (await sitemapUrls()).filter((u) => !done.has(u));
  const kinds = await pageKinds();
  todo.sort((a, b) => priority(a, kinds) - priority(b, kinds));
  if (todo.length === 0) return console.log('站点地图里的网址都推送过了');

  // 先推 1 条拿到今天的剩余额度，再按额度推剩下的
  let result = await push(endpoint, todo.slice(0, 1));
  if (result.error) return console.error('推送失败：', result);
  let sent = todo.slice(0, 1);
  const batch = todo.slice(1, 1 + Math.max(0, result.remain ?? 0));
  if (batch.length) {
    const more = await push(endpoint, batch);
    if (more.error) console.error('第二批推送失败：', more);
    else {
      sent = sent.concat(batch);
      result = more;
    }
  }

  await writeFile(STATE_FILE, `${JSON.stringify([...pushed, ...sent], null, 2)}\n`);
  console.log(`本次推送 ${sent.length} 条，今天剩余额度 ${result.remain ?? '?'}，还有 ${todo.length - sent.length} 条待推送`);
  for (const u of sent) console.log(`  ${u}`);
}

if (process.argv[1]?.endsWith('baidu-push.mjs')) await main();
