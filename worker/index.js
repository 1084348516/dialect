import { EmailMessage } from 'cloudflare:email';
import { handleFeedback, buildEmailRaw } from '../src/server/feedback.js';

// 只有 /api/* 会进到这里（见 wrangler.toml 的 run_worker_first），其余请求直接由静态资源响应
export default {
  async fetch(request, env) {
    const { pathname } = new URL(request.url);
    if (pathname === '/api/feedback') {
      if (request.method !== 'POST') return new Response(null, { status: 405, headers: { Allow: 'POST' } });
      const origin = new URL(request.url).origin;
      return handleFeedback(request, env, {
        sendEmail: async (env, f) => {
          const entry = await findEntry(env, origin, f);
          const raw = buildEmailRaw({ from: env.FEEDBACK_EMAIL_FROM, to: env.FEEDBACK_EMAIL_TO, f, entry, siteUrl: origin });
          await env.SEND_EMAIL.send(new EmailMessage(env.FEEDBACK_EMAIL_FROM, env.FEEDBACK_EMAIL_TO, raw));
        },
      });
    }
    return env.ASSETS.fetch(request);
  },
};

// 从构建时生成的词条清单（src/pages/feedback-entries.json.ts）查词条名称、读音，让通知邮件更好读；查不到就只显示 id
async function findEntry(env, origin, f) {
  if (!f.dialect) return null;
  try {
    const res = await env.ASSETS.fetch(new Request(`${origin}/feedback-entries.json`));
    if (!res.ok) return null;
    const list = await res.json();
    if (f.entry) return list.find((e) => e.dialect === f.dialect && e.id === f.entry) ?? null;
    // 方言页的反馈只带方言，借任意一条词条拿到方言名
    const name = list.find((e) => e.dialect === f.dialect)?.dialectName;
    return name ? { dialectName: name } : null;
  } catch {
    return null;
  }
}
