import { describe, it, expect, vi } from 'vitest';
import { handleFeedback, validateFeedback, buildEmailRaw, MAX_EMAILS_PER_DAY } from '../src/server/feedback.js';

function mockDb({ fail = false, today = 1 } = {}) {
  const calls = [];
  return {
    calls,
    prepare(sql) {
      return {
        bind(...args) {
          return {
            async run() {
              if (fail) throw new Error('db down');
              calls.push({ sql, args });
              return { success: true, meta: { last_row_id: 7 } };
            },
          };
        },
        async first() {
          calls.push({ sql, args: [] });
          return { n: today };
        },
      };
    },
  };
}

const req = (body, { origin = 'https://example.com', ip = '1.2.3.4' } = {}) =>
  new Request('https://example.com/api/feedback', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(origin ? { Origin: origin } : {}), ...(ip ? { 'CF-Connecting-IP': ip } : {}) },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  });

const limiter = (success) => ({ limit: vi.fn().mockResolvedValue({ success }) });

const valid = { dialect: 'minnan', entry: 'a-ma', lang: 'zh-hans', type: 'pron', message: '应该是 a-má', background: '厦门人', contact: '' };
const quiet = { error: vi.fn() };

describe('handleFeedback', () => {
  it('stores valid feedback and returns 200', async () => {
    const DB = mockDb();
    const res = await handleFeedback(req(valid), { DB }, { log: quiet });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
    expect(DB.calls).toHaveLength(1);
    expect(DB.calls[0].sql).toMatch(/INSERT INTO feedback/);
    expect(DB.calls[0].args).toEqual(['minnan', 'a-ma', 'zh-hans', 'pron', '应该是 a-má', '厦门人', null]);
  });

  it('silently drops honeypot submissions', async () => {
    const DB = mockDb();
    const res = await handleFeedback(req({ ...valid, website: 'http://spam' }), { DB }, { log: quiet });
    expect(res.status).toBe(200);
    expect(DB.calls).toHaveLength(0);
  });

  it.each([
    ['not json', 'body'],
    ['[1,2]', 'body'],
    ['null', 'body'],
    [JSON.stringify({ ...valid, message: '   ' }), 'message'],
    [JSON.stringify({ ...valid, message: 'x'.repeat(1001) }), 'message'],
    [JSON.stringify({ ...valid, type: 'spam' }), 'type'],
    [JSON.stringify({ ...valid, lang: 'fr' }), 'lang'],
    [JSON.stringify({ ...valid, dialect: '../etc' }), 'dialect'],
    [JSON.stringify({ ...valid, entry: 'A B' }), 'entry'],
    [JSON.stringify({ ...valid, dialect: '' }), 'entry'],
    [JSON.stringify({ ...valid, background: 'x'.repeat(51) }), 'background'],
    [JSON.stringify({ ...valid, contact: 'x'.repeat(101) }), 'contact'],
    [JSON.stringify({ ...valid, message: 'x'.repeat(9000) }), 'body'],
  ])('rejects bad input with 400 (#%#, field %1$s)', async (body, field) => {
    const DB = mockDb();
    const res = await handleFeedback(req(body), { DB }, { log: quiet });
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: field });
    expect(DB.calls).toHaveLength(0);
  });

  it('accepts site-wide feedback without dialect or entry', async () => {
    const DB = mockDb();
    const res = await handleFeedback(req({ ...valid, dialect: '', entry: '', type: 'request' }), { DB }, { log: quiet });
    expect(res.status).toBe(200);
    expect(DB.calls[0].args.slice(0, 4)).toEqual(['', '', 'zh-hans', 'request']);
    expect((await handleFeedback(req({ ...valid, entry: '', type: 'site' }), { DB: mockDb() }, { log: quiet })).status).toBe(200);
  });

  it('accepts a 1000-character message', async () => {
    const res = await handleFeedback(req({ ...valid, message: '字'.repeat(1000) }), { DB: mockDb() }, { log: quiet });
    expect(res.status).toBe(200);
  });

  it('returns 500 when D1 fails or is not bound', async () => {
    expect((await handleFeedback(req(valid), { DB: mockDb({ fail: true }) }, { log: quiet })).status).toBe(500);
    expect((await handleFeedback(req(valid), {}, { log: quiet })).status).toBe(500);
  });

  it('sends email only when configured, and email failure still returns 200', async () => {
    const sendEmail = vi.fn().mockResolvedValue(undefined);
    const env = { DB: mockDb(), FEEDBACK_EMAIL_TO: 'me@x.com', FEEDBACK_EMAIL_FROM: 'bot@x.com', SEND_EMAIL: {} };
    await handleFeedback(req(valid), env, { sendEmail, log: quiet });
    expect(sendEmail).toHaveBeenCalledTimes(1);
    expect(sendEmail.mock.calls[0][1]).toMatchObject({ dialect: 'minnan', entry: 'a-ma', id: 7 });

    const notConfigured = vi.fn();
    await handleFeedback(req(valid), { DB: mockDb() }, { sendEmail: notConfigured, log: quiet });
    expect(notConfigured).not.toHaveBeenCalled();

    const failing = vi.fn().mockRejectedValue(new Error('smtp'));
    const res = await handleFeedback(req(valid), { ...env, DB: mockDb() }, { sendEmail: failing, log: quiet });
    expect(res.status).toBe(200);
    expect(quiet.error).toHaveBeenCalled();
  });
});

describe('handleFeedback abuse protection', () => {
  it('rejects requests from other sites or without Origin', async () => {
    for (const origin of ['https://evil.com', null]) {
      const DB = mockDb();
      const res = await handleFeedback(req(valid, { origin }), { DB }, { log: quiet });
      expect(res.status).toBe(403);
      expect(await res.json()).toEqual({ error: 'origin' });
      expect(DB.calls).toHaveLength(0);
    }
  });

  it('rate limits by client IP', async () => {
    const ok = limiter(true);
    expect((await handleFeedback(req(valid), { DB: mockDb(), FEEDBACK_LIMITER: ok }, { log: quiet })).status).toBe(200);
    expect(ok.limit).toHaveBeenCalledWith({ key: '1.2.3.4' });

    const DB = mockDb();
    const res = await handleFeedback(req(valid), { DB, FEEDBACK_LIMITER: limiter(false) }, { log: quiet });
    expect(res.status).toBe(429);
    expect(await res.json()).toEqual({ error: 'rate' });
    expect(DB.calls).toHaveLength(0);
  });

  it('lets feedback through when the limiter itself fails', async () => {
    const broken = { limit: vi.fn().mockRejectedValue(new Error('down')) };
    expect((await handleFeedback(req(valid), { DB: mockDb(), FEEDBACK_LIMITER: broken }, { log: quiet })).status).toBe(200);
  });

  it('stops emailing after the daily cap but still stores feedback', async () => {
    const email = { FEEDBACK_EMAIL_TO: 'me@x.com', FEEDBACK_EMAIL_FROM: 'bot@x.com', SEND_EMAIL: {} };
    const sendEmail = vi.fn().mockResolvedValue(undefined);

    await handleFeedback(req(valid), { ...email, DB: mockDb({ today: MAX_EMAILS_PER_DAY }) }, { sendEmail, log: quiet });
    expect(sendEmail).toHaveBeenCalledTimes(1);

    const DB = mockDb({ today: MAX_EMAILS_PER_DAY + 1 });
    const res = await handleFeedback(req(valid), { ...email, DB }, { sendEmail, log: quiet });
    expect(res.status).toBe(200);
    expect(DB.calls[0].sql).toMatch(/INSERT INTO feedback/);
    expect(sendEmail).toHaveBeenCalledTimes(1);
  });
});

describe('validateFeedback', () => {
  it('trims fields and turns empty optionals into null', () => {
    const r = validateFeedback({ ...valid, message: '  hi  ', background: ' ', contact: ' a@b.c ' });
    expect(r).toEqual({ ok: true, value: { ...valid, message: 'hi', background: null, contact: 'a@b.c' } });
  });
});

const fromB64 = (b) => new TextDecoder().decode(Uint8Array.from(atob(b.replace(/\r\n/g, '')), (c) => c.charCodeAt(0)));
const decodeParts = (raw) =>
  [...raw.matchAll(/Content-Type: (text\/\w+); charset=UTF-8\r\nContent-Transfer-Encoding: base64\r\n\r\n([A-Za-z0-9+/=\r\n]+?)\r\n--/g)].map(
    ([, type, b]) => ({ type, body: fromB64(b) }),
  );
const decodeSubject = (raw) => fromB64(raw.match(/Subject: =\?UTF-8\?B\?(.+?)\?=/)[1]);

describe('buildEmailRaw', () => {
  const now = new Date('2026-10-14T00:00:00Z');
  const entry = { dialectName: '闽南语', text: '阿嬷', pron: 'a-má', zh: '奶奶；祖母', url: '/minnan/a-ma/' };

  it('builds a multipart message with readable labels, link and done command', () => {
    const f = { ...valid, id: 12, background: '厦门人', contact: null };
    const raw = buildEmailRaw({ from: 'bot@x.com', to: 'me@x.com', f, entry, siteUrl: 'https://familect.org', now, id: 'abc' });
    expect(raw).toMatch(/^From: Familect <bot@x\.com>\r\n/);
    expect(raw).toContain('Message-ID: <abc@x.com>');
    expect(raw).toContain('multipart/alternative');
    expect(raw).not.toContain('Reply-To');
    expect(decodeSubject(raw)).toBe('[Familect 反馈 #12] 闽南语 · 阿嬷 — 读音 / 拼音不对');

    const [text, html] = decodeParts(raw);
    expect(text.type).toBe('text/plain');
    expect(text.body).toContain('应该是 a-má');
    expect(text.body).toContain('阿嬷  ·  a-má  ·  奶奶；祖母');
    expect(text.body).toContain('2026-10-14 08:00（北京时间）');
    expect(text.body).toContain('https://familect.org/minnan/a-ma/');
    expect(text.body).toContain("UPDATE feedback SET status='done' WHERE id=12");
    expect(html.type).toBe('text/html');
    expect(html.body).toContain('href="https://familect.org/minnan/a-ma/"');
  });

  it('falls back to ids, escapes HTML and sets Reply-To for email contacts', () => {
    const f = { ...valid, id: null, message: '<b>x</b>', background: null, contact: 'fan@qq.com' };
    const raw = buildEmailRaw({ from: 'bot@x.com', to: 'me@x.com', f, now, id: 'abc' });
    expect(raw).toContain('Reply-To: <fan@qq.com>');
    expect(decodeSubject(raw)).toBe('[Familect 反馈] minnan · a-ma — 读音 / 拼音不对');
    const [text, html] = decodeParts(raw);
    expect(text.body).toContain('https://familect.org/minnan/a-ma/');
    expect(text.body).not.toContain('UPDATE feedback');
    expect(html.body).toContain('&lt;b&gt;x&lt;/b&gt;');
  });

  it('handles site-wide and dialect-only feedback', () => {
    const site = buildEmailRaw({ from: 'bot@x.com', to: 'me@x.com', f: { ...valid, dialect: '', entry: '', type: 'request', id: 3 }, now, id: 'abc' });
    expect(decodeSubject(site)).toBe('[Familect 反馈 #3] 全站 — 想加的方言或词条');
    const [text, html] = decodeParts(site);
    expect(text.body).toContain('页面：https://familect.org/');
    expect(text.body).not.toContain('词条：');
    expect(html.body).toContain('打开页面');

    const dialectOnly = buildEmailRaw({ from: 'bot@x.com', to: 'me@x.com', f: { ...valid, entry: '', type: 'site', id: 4 }, entry: { dialectName: '闽南语' }, now, id: 'abc' });
    expect(decodeSubject(dialectOnly)).toBe('[Familect 反馈 #4] 闽南语 — 网站问题');
    expect(decodeParts(dialectOnly)[0].body).toContain('https://familect.org/minnan/');
  });
});
