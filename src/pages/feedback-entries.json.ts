import type { APIRoute } from 'astro';
import { entryPath, pick } from '../i18n/langs';
import { getDialects } from '../lib/data';

// 反馈通知邮件用的词条清单（worker/index.js 的 findEntry 读取），只给简体
export const GET: APIRoute = async () => {
  const records = (await getDialects('zh-hans'))
    .filter((d) => d.status === 'live')
    .flatMap((d) =>
      d.entries.map((e) => ({
        dialect: d.id,
        dialectName: pick('zh-hans', d.name, d.nameEn),
        id: e.id,
        url: entryPath('zh-hans', d.id, e.id),
        text: e.text,
        pron: e.pron,
        zh: e.zh,
      })),
    );
  return new Response(JSON.stringify(records), { headers: { 'Content-Type': 'application/json; charset=utf-8' } });
};
