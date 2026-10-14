// 反馈接口的业务逻辑。和 Cloudflare 运行时无关，邮件发送由调用方注入（见 functions/api/feedback.js）。
export const FEEDBACK_TYPES = ['pron', 'translation', 'chars', 'other'];
const LANGS = ['zh-hans', 'zh-hant', 'en'];
const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const MAX_BODY_BYTES = 8 * 1024;

const str = (v) => (typeof v === 'string' ? v.trim() : '');
const len = (s) => [...s].length;

export function validateFeedback(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return { ok: false, field: 'body' };
  const v = {
    dialect: str(input.dialect),
    entry: str(input.entry),
    lang: str(input.lang),
    type: str(input.type),
    message: str(input.message),
    background: str(input.background),
    contact: str(input.contact),
  };
  if (!SLUG.test(v.dialect) || v.dialect.length > 64) return { ok: false, field: 'dialect' };
  if (!SLUG.test(v.entry) || v.entry.length > 100) return { ok: false, field: 'entry' };
  if (!LANGS.includes(v.lang)) return { ok: false, field: 'lang' };
  if (!FEEDBACK_TYPES.includes(v.type)) return { ok: false, field: 'type' };
  if (len(v.message) < 1 || len(v.message) > 1000) return { ok: false, field: 'message' };
  if (len(v.background) > 50) return { ok: false, field: 'background' };
  if (len(v.contact) > 100) return { ok: false, field: 'contact' };
  return { ok: true, value: { ...v, background: v.background || null, contact: v.contact || null } };
}

const json = (status, data) =>
  new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json; charset=utf-8' } });

export async function handleFeedback(request, env, deps = {}) {
  const log = deps.log ?? console;

  let raw;
  try {
    raw = await request.text();
  } catch {
    return json(400, { error: 'body' });
  }
  if (new TextEncoder().encode(raw).length > MAX_BODY_BYTES) return json(400, { error: 'body' });

  let input;
  try {
    input = JSON.parse(raw);
  } catch {
    return json(400, { error: 'body' });
  }

  if (input && typeof input === 'object' && typeof input.website === 'string' && input.website.trim() !== '') {
    return json(200, { ok: true });
  }

  const result = validateFeedback(input);
  if (!result.ok) return json(400, { error: result.field });
  const f = result.value;

  try {
    await env.DB.prepare(
      'INSERT INTO feedback (dialect, entry, lang, type, message, background, contact) VALUES (?, ?, ?, ?, ?, ?, ?)',
    )
      .bind(f.dialect, f.entry, f.lang, f.type, f.message, f.background, f.contact)
      .run();
  } catch (err) {
    log.error('feedback: D1 insert failed', err);
    return json(500, { error: 'storage' });
  }

  if (deps.sendEmail && env.FEEDBACK_EMAIL_TO && env.FEEDBACK_EMAIL_FROM && env.SEND_EMAIL) {
    try {
      await deps.sendEmail(env, f);
    } catch (err) {
      log.error('feedback: email failed', err);
    }
  }

  return json(200, { ok: true });
}

function b64(s) {
  let bin = '';
  for (const byte of new TextEncoder().encode(s)) bin += String.fromCharCode(byte);
  return btoa(bin);
}

export function buildEmailRaw({ from, to, f, now = new Date(), id = crypto.randomUUID() }) {
  const subject = `[Familect] ${f.dialect}/${f.entry} · ${f.type}`;
  const body = [
    `方言：${f.dialect}`,
    `词条：${f.entry}`,
    `语言：${f.lang}`,
    `类型：${f.type}`,
    '',
    f.message,
    '',
    `方言背景：${f.background ?? '—'}`,
    `联系方式：${f.contact ?? '—'}`,
  ].join('\n');
  const domain = from.split('@')[1] ?? 'localhost';
  return [
    `From: Familect <${from}>`,
    `To: <${to}>`,
    `Subject: =?UTF-8?B?${b64(subject)}?=`,
    `Message-ID: <${id}@${domain}>`,
    `Date: ${now.toUTCString()}`,
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset=UTF-8',
    'Content-Transfer-Encoding: base64',
    '',
    (b64(body).match(/.{1,76}/g) ?? []).join('\r\n'),
  ].join('\r\n');
}
