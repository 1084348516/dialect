// 通过 IndexNow 把站点地图里的全部网址通知给 Bing（以及 Yandex 等支持 IndexNow 的搜索引擎）。
// 密钥文件 public/<KEY>.txt 部署后才能验证，所以要在网站上线之后运行。用法：npm run indexnow
import { SITE, sitemapUrls } from './sitemap-urls.mjs';

const KEY = '004022f261174dc7d8baf902f5efb62f';

const urls = await sitemapUrls();
const res = await fetch('https://api.indexnow.org/indexnow', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json; charset=utf-8' },
  body: JSON.stringify({ host: new URL(SITE).host, key: KEY, keyLocation: `${SITE}/${KEY}.txt`, urlList: urls }),
});
// 200 已接收；202 已接收、密钥待验证；其余为出错
if (res.status === 200 || res.status === 202) {
  console.log(`IndexNow：已提交 ${urls.length} 个网址（HTTP ${res.status}）`);
} else {
  console.error(`IndexNow 提交失败：HTTP ${res.status} ${await res.text()}`);
  process.exit(1);
}
