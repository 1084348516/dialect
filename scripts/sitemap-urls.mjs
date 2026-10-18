// 读取线上站点地图里的全部网址，供 baidu-push.mjs、indexnow.mjs 使用
export const SITE = 'https://familect.org';

export async function sitemapUrls() {
  const index = await (await fetch(`${SITE}/sitemap-index.xml`)).text();
  const maps = [...index.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
  const urls = [];
  for (const map of maps) {
    const xml = await (await fetch(map)).text();
    urls.push(...[...xml.matchAll(/<url><loc>([^<]+)<\/loc>/g)].map((m) => m[1]));
  }
  return urls;
}
