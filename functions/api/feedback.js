import { EmailMessage } from 'cloudflare:email';
import { handleFeedback, buildEmailRaw } from '../../src/server/feedback.js';

export async function onRequestPost({ request, env }) {
  return handleFeedback(request, env, {
    sendEmail: async (env, f) => {
      const raw = buildEmailRaw({ from: env.FEEDBACK_EMAIL_FROM, to: env.FEEDBACK_EMAIL_TO, f });
      await env.SEND_EMAIL.send(new EmailMessage(env.FEEDBACK_EMAIL_FROM, env.FEEDBACK_EMAIL_TO, raw));
    },
  });
}
