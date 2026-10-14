import { describe, it, expect, vi } from 'vitest';
import { handleFeedback, validateFeedback, buildEmailRaw } from '../src/server/feedback.js';

function mockDb({ fail = false } = {}) {
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
              return { success: true };
            },
          };
        },
      };
    },
  };
}

const req = (body) =>
  new Request('https://example.com/api/feedback', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  });

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
    [JSON.stringify({ ...valid, entry: '' }), 'entry'],
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
    expect(sendEmail.mock.calls[0][1]).toMatchObject({ dialect: 'minnan', entry: 'a-ma' });

    const notConfigured = vi.fn();
    await handleFeedback(req(valid), { DB: mockDb() }, { sendEmail: notConfigured, log: quiet });
    expect(notConfigured).not.toHaveBeenCalled();

    const failing = vi.fn().mockRejectedValue(new Error('smtp'));
    const res = await handleFeedback(req(valid), { ...env, DB: mockDb() }, { sendEmail: failing, log: quiet });
    expect(res.status).toBe(200);
    expect(quiet.error).toHaveBeenCalled();
  });
});

describe('validateFeedback', () => {
  it('trims fields and turns empty optionals into null', () => {
    const r = validateFeedback({ ...valid, message: '  hi  ', background: ' ', contact: ' a@b.c ' });
    expect(r).toEqual({ ok: true, value: { ...valid, message: 'hi', background: null, contact: 'a@b.c' } });
  });
});

describe('buildEmailRaw', () => {
  it('builds a MIME message with Message-ID and a base64 UTF-8 body', () => {
    const f = { ...valid, background: '厦门人', contact: null };
    const raw = buildEmailRaw({ from: 'bot@x.com', to: 'me@x.com', f, now: new Date('2026-10-14T00:00:00Z'), id: 'abc' });
    expect(raw).toMatch(/^From: Familect <bot@x\.com>\r\n/);
    expect(raw).toContain('Message-ID: <abc@x.com>');
    expect(raw).toContain('Content-Transfer-Encoding: base64');
    const body = raw.split('\r\n\r\n')[1].replace(/\r\n/g, '');
    const decoded = new TextDecoder().decode(Uint8Array.from(atob(body), (c) => c.charCodeAt(0)));
    expect(decoded).toContain('应该是 a-má');
    expect(decoded).toContain('minnan');
  });
});
