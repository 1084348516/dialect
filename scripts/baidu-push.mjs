// 把线上站点地图里的网址推送给百度站长平台（普通收录 → API 提交）。
// 新站每天额度很少，所以按重要程度排序，只推额度内的，推过的记在 .baidu-pushed.json，第二天再跑接着推。
// 用法：BAIDU_TOKEN=xxx npm run baidu-push
import { readFile, writeFile } from 'node:fs/promises';

const SITE = 'https://familect.org';
const STATE_FILE = '.baidu-pushed.json';
const token = process.env.BAIDU_TOKEN;
if (!token) {
  console.error('缺少 BAIDU_TOKEN（在百度站长平台 → 普通收录 → API 提交里找）');
  process.exit(1);
}
// site 参数要原样传，编码后百度会报 site init fail
const endpoint = `http://data.zz.baidu.com/urls?site=${SITE}&token=${encodeURIComponent(token)}`;

async function sitemapUrls() {
  const index = await (await fetch(`${SITE}/sitemap-index.xml`)).text();
  const maps = [...index.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
  const urls = [];
  for (const map of maps) {
    const xml = await (await fetch(map)).text();
    urls.push(...[...xml.matchAll(/<url><loc>([^<]+)<\/loc>/g)].map((m) => m[1]));
  }
  return urls;
}

// 百度主要服务中文搜索：简体优先，其次繁体，英文最后；同一语言里首页、方言页优先于词条页和说明页
export function priority(url) {
  const path = new URL(url).pathname;
  const lang = path.startsWith('/en/') ? 2 : path.startsWith('/zh-hant/') ? 1 : 0;
  const rest = path.replace(/^\/(en|zh-hant)\//, '/').split('/').filter(Boolean);
  const info = ['about', 'privacy', 'contact'].includes(rest[0]);
  const depth = rest.length === 0 ? 0 : info ? 3 : rest.length;
  return lang * 10 + depth;
}

async function push(urls) {
  const res = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'text/plain' }, body: urls.join('\n') });
  return res.json();
}

async function main() {
  let pushed = [];
  try {
    pushed = JSON.parse(await readFile(STATE_FILE, 'utf8'));
  } catch {}
  const done = new Set(pushed);
  const todo = (await sitemapUrls()).filter((u) => !done.has(u)).sort((a, b) => priority(a) - priority(b));
  if (todo.length === 0) return console.log('站点地图里的网址都推送过了');

  // 先推 1 条拿到今天的剩余额度，再按额度推剩下的
  let result = await push(todo.slice(0, 1));
  if (result.error) return console.error('推送失败：', result);
  let sent = todo.slice(0, 1);
  const batch = todo.slice(1, 1 + Math.max(0, result.remain ?? 0));
  if (batch.length) {
    const more = await push(batch);
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
