// 反馈接口的业务逻辑。和 Cloudflare 运行时无关，邮件发送由调用方注入（见 worker/index.js）。
export const FEEDBACK_TYPES = ['pron', 'translation', 'chars', 'request', 'site', 'other'];
const LANGS = ['zh-hans', 'zh-hant', 'en'];
const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const MAX_BODY_BYTES = 8 * 1024;
// 每天（北京时间）最多发这么多封通知邮件，超过的只入库，免得被刷时收件箱被灌满
export const MAX_EMAILS_PER_DAY = 30;

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
  // 页脚的全站反馈不带词条（可能也不带方言），存成空字符串；带词条时必须同时带方言
  if (v.dialect && (!SLUG.test(v.dialect) || v.dialect.length > 64)) return { ok: false, field: 'dialect' };
  if (v.entry && (!v.dialect || !SLUG.test(v.entry) || v.entry.length > 100)) return { ok: false, field: 'entry' };
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

  // 只接受本站页面发来的请求（浏览器提交 POST 时总会带 Origin）
  if (request.headers.get('Origin') !== new URL(request.url).origin) return json(403, { error: 'origin' });

  // 按 IP 限流，频率见 wrangler.toml 的 [[ratelimits]]；限流服务本身出错时放行
  if (env.FEEDBACK_LIMITER) {
    const ip = request.headers.get('CF-Connecting-IP') ?? 'unknown';
    try {
      const { success } = await env.FEEDBACK_LIMITER.limit({ key: ip });
      if (!success) return json(429, { error: 'rate' });
    } catch (err) {
      log.error('feedback: rate limiter failed', err);
    }
  }

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

  let id = null;
  try {
    const res = await env.DB.prepare(
      'INSERT INTO feedback (dialect, entry, lang, type, message, background, contact) VALUES (?, ?, ?, ?, ?, ?, ?)',
    )
      .bind(f.dialect, f.entry, f.lang, f.type, f.message, f.background, f.contact)
      .run();
    id = res?.meta?.last_row_id ?? null;
  } catch (err) {
    log.error('feedback: D1 insert failed', err);
    return json(500, { error: 'storage' });
  }

  if (deps.sendEmail && env.FEEDBACK_EMAIL_TO && env.FEEDBACK_EMAIL_FROM && env.SEND_EMAIL) {
    try {
      // 今天收到的条数（含刚才这条）；created_at 是 UTC，换算成北京时间的零点再比较
      const today = await env.DB.prepare(
        "SELECT COUNT(*) AS n FROM feedback WHERE created_at >= datetime('now', '+8 hours', 'start of day', '-8 hours')",
      ).first();
      if ((today?.n ?? 0) > MAX_EMAILS_PER_DAY) return json(200, { ok: true });
      await deps.sendEmail(env, { ...f, id });
    } catch (err) {
      log.error('feedback: email failed', err);
    }
  }

  return json(200, { ok: true });
}

const TYPE_LABEL = { pron: '读音 / 拼音不对', translation: '翻译不对', chars: '用字不对', request: '想加的方言或词条', site: '网站问题', other: '其他' };
const LANG_LABEL = { 'zh-hans': '简体', 'zh-hant': '繁体', en: '英文' };
const EMAIL_RE = /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/;

function b64(s) {
  let bin = '';
  for (const byte of new TextEncoder().encode(s)) bin += String.fromCharCode(byte);
  return btoa(bin);
}

const wrap76 = (s) => (s.match(/.{1,76}/g) ?? []).join('\r\n');
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

/** 北京时间，例如 2026-10-16 14:05 */
function beijingTime(now) {
  const t = new Date(now.getTime() + 8 * 3600 * 1000).toISOString();
  return `${t.slice(0, 10)} ${t.slice(11, 16)}`;
}

/**
 * 组装反馈通知邮件（纯文本 + HTML 两个版本）。
 * entry 是可选的词条信息（dialectName/text/pron/zh/url），查不到时退回显示 id。
 * 全站反馈没有词条：标题和链接只到方言页，连方言也没有就是「全站」、链接到首页。
 */
export function buildEmailRaw({ from, to, f, entry = null, siteUrl = 'https://familect.org', now = new Date(), id = crypto.randomUUID() }) {
  const typeLabel = TYPE_LABEL[f.type] ?? f.type;
  const dialectName = entry?.dialectName ?? (f.dialect || '全站');
  const entryText = entry?.text ?? f.entry;
  const path = entry?.url ?? (f.entry ? `/${f.dialect}/${f.entry}/` : f.dialect ? `/${f.dialect}/` : '/');
  const link = `${siteUrl.replace(/\/$/, '')}${path}`;
  const linkLabel = f.entry ? '词条页面' : '页面';
  const no = f.id != null ? ` #${f.id}` : '';
  const title = [dialectName, entryText].filter(Boolean).join(' · ');
  const subject = `[Familect 反馈${no}] ${title} — ${typeLabel}`;
  const entryLine = [entryText, entry?.pron, entry?.zh].filter(Boolean).join('  ·  ');
  const doneSql = f.id != null ? `UPDATE feedback SET status='done' WHERE id=${f.id}` : null;

  const rows = [
    ['问题类型', typeLabel],
    ['方言', dialectName],
    ...(entryText ? [['词条', entryLine]] : []),
    ['方言背景', f.background ?? '—'],
    ['联系方式', f.contact ?? '—'],
    ['页面语言', LANG_LABEL[f.lang] ?? f.lang],
    ['提交时间', `${beijingTime(now)}（北京时间）`],
  ];

  const text = [
    `收到一条新反馈${no}`,
    '',
    ...rows.map(([k, v]) => `${k}：${v}`),
    '',
    '—— 反馈内容 ——',
    f.message,
    '',
    `${linkLabel}：${link}`,
    ...(doneSql ? ['', '处理完后标记为已处理：', `npx wrangler d1 execute familect --remote --command "${doneSql}"`] : []),
  ].join('\n');

  const td = 'padding:6px 12px 6px 0;vertical-align:top';
  const html = `<!doctype html><html><body style="margin:0;padding:24px;background:#f6f4ef;font-family:-apple-system,'PingFang SC','Microsoft YaHei',sans-serif;color:#222">
<div style="max-width:560px;margin:0 auto;background:#fff;border-radius:12px;padding:24px;border:1px solid #e6e1d6">
<p style="margin:0 0 4px;font-size:13px;color:#8a8170">Familect 家乡话 · 新反馈${esc(no)}</p>
<h2 style="margin:0 0 16px;font-size:20px">${esc(title)} <span style="font-size:14px;font-weight:normal;color:#b5482b">${esc(typeLabel)}</span></h2>
<div style="white-space:pre-wrap;background:#faf7f0;border-left:4px solid #b5482b;padding:12px 16px;margin:0 0 16px;font-size:15px;line-height:1.6">${esc(f.message)}</div>
<table style="border-collapse:collapse;font-size:14px;line-height:1.5">
${rows.map(([k, v]) => `<tr><td style="${td};color:#8a8170;white-space:nowrap">${esc(k)}</td><td style="${td}">${esc(v)}</td></tr>`).join('\n')}
</table>
<p style="margin:20px 0 0"><a href="${esc(link)}" style="display:inline-block;background:#b5482b;color:#fff;text-decoration:none;padding:8px 16px;border-radius:6px;font-size:14px">打开${linkLabel}</a></p>
${doneSql ? `<p style="margin:20px 0 0;font-size:12px;color:#8a8170">处理完后标记为已处理：<br><code style="font-size:12px;word-break:break-all">npx wrangler d1 execute familect --remote --command "${esc(doneSql)}"</code></p>` : ''}
</div></body></html>`;

  const domain = from.split('@')[1] ?? 'localhost';
  const boundary = `familect-${id}`;
  const part = (type, body) =>
    [`--${boundary}`, `Content-Type: ${type}; charset=UTF-8`, 'Content-Transfer-Encoding: base64', '', wrap76(b64(body))].join('\r\n');

  return [
    `From: Familect <${from}>`,
    `To: <${to}>`,
    ...(f.contact && EMAIL_RE.test(f.contact) ? [`Reply-To: <${f.contact}>`] : []),
    `Subject: =?UTF-8?B?${b64(subject)}?=`,
    `Message-ID: <${id}@${domain}>`,
    `Date: ${now.toUTCString()}`,
    'MIME-Version: 1.0',
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
    '',
    part('text/plain', text),
    part('text/html', html),
    `--${boundary}--`,
    '',
  ].join('\r\n');
}
