import { EmailMessage } from 'cloudflare:email';
import { handleFeedback, buildEmailRaw } from '../src/server/feedback.js';

// 只有 /api/* 会进到这里（见 wrangler.toml 的 run_worker_first），其余请求直接由静态资源响应
export default {
  async fetch(request, env) {
    const { pathname } = new URL(request.url);
    if (pathname === '/api/feedback') {
      if (request.method !== 'POST') return new Response(null, { status: 405, headers: { Allow: 'POST' } });
      return handleFeedback(request, env, {
        sendEmail: async (env, f) => {
          const raw = buildEmailRaw({ from: env.FEEDBACK_EMAIL_FROM, to: env.FEEDBACK_EMAIL_TO, f });
          await env.SEND_EMAIL.send(new EmailMessage(env.FEEDBACK_EMAIL_FROM, env.FEEDBACK_EMAIL_TO, raw));
        },
      });
    }
    return env.ASSETS.fetch(request);
  },
};
