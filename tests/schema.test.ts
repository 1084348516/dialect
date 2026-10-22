import { describe, it, expect } from 'vitest';
import { dialectSchema, assertDialectId } from '../src/lib/schema';
import { rawMinnan } from './fixtures';

const entries = rawMinnan.entries;
const issues = (data: unknown) => {
  const r = dialectSchema.safeParse(data);
  return r.success ? [] : r.error.issues.map((i) => i.message);
};

describe('dialectSchema', () => {
  it('accepts a valid live dialect and fills defaults', () => {
    const d = dialectSchema.parse(rawMinnan);
    const akong = d.entries[1];
    expect(akong.alt).toEqual([]);
    expect(akong.spellings).toEqual([]);
    expect(akong.regions).toEqual([]);
    expect(akong.examples).toEqual([]);
    expect(akong.featured).toBe(false);
    expect(akong.note).toBeUndefined();
    expect(d.entries[0].variants[1].text).toBeUndefined();
    expect(d.reviewed).toBe(false);
    expect(d.traditional).toBe(false);
  });

  it('treats homophone, enReading and English glosses as optional', () => {
    const bare = { id: 'bare', text: '多谢', pron: 'to-siā', zh: '谢谢', category: 'greeting', examples: [{ text: '多谢。', pron: 'To-siā.', zh: '谢谢。' }] };
    const d = dialectSchema.parse({ ...rawMinnan, entries: [...entries, bare] });
    const e = d.entries[3];
    expect(e.homophone).toBeUndefined();
    expect(e.enReading).toBeUndefined();
    expect(e.en).toBeUndefined();
    expect(e.examples[0].en).toBeUndefined();
  });

  it('accepts a soon dialect with only basic info', () => {
    const r = dialectSchema.safeParse({ name: '客家话', nameEn: 'Hakka', status: 'soon', order: 4, areas: '梅州', areasEn: 'Meizhou' });
    expect(r.success).toBe(true);
  });

  it('rejects a live dialect without entries', () => {
    expect(issues({ ...rawMinnan, entries: [] }).join()).toMatch(/at least one entry/);
  });

  it('rejects a live dialect without intro or romanization', () => {
    expect(issues({ ...rawMinnan, intro: undefined }).join()).toMatch(/intro/);
    expect(issues({ ...rawMinnan, romanization: undefined }).join()).toMatch(/romanization/);
  });

  it('rejects an unknown category and names the entry', () => {
    const bad = { ...rawMinnan, entries: [{ ...entries[1], category: 'food' }] };
    expect(issues(bad).join()).toMatch(/entry "a-kong": unknown category "food"/);
  });

  it('rejects an unknown region', () => {
    const bad = { ...rawMinnan, entries: [{ ...entries[1], regions: ['hk'] }] };
    expect(issues(bad).join()).toMatch(/entry "a-kong": unknown region "hk"/);
  });

  it('rejects duplicate entry ids', () => {
    const bad = { ...rawMinnan, entries: [entries[1], entries[1]] };
    expect(issues(bad).join()).toMatch(/duplicate entry id "a-kong"/);
  });

  it('rejects entry ids that clash with dialect sub-pages', () => {
    const bad = { ...rawMinnan, entries: [{ ...entries[1], id: 'export' }] };
    expect(issues(bad).join()).toMatch(/entry id "export" is reserved/);
  });

  it('rejects bad slugs and missing required fields', () => {
    expect(issues({ ...rawMinnan, entries: [{ ...entries[1], id: 'A_kong' }] }).length).toBeGreaterThan(0);
    const { pron: _omit, ...noPron } = entries[1];
    expect(issues({ ...rawMinnan, entries: [noPron] }).length).toBeGreaterThan(0);
  });
});

describe('assertDialectId', () => {
  it('rejects reserved and malformed ids', () => {
    expect(() => assertDialectId('minnan')).not.toThrow();
    expect(() => assertDialectId('en')).toThrow(/reserved/);
    expect(() => assertDialectId('zh-hant')).toThrow(/reserved/);
    expect(() => assertDialectId('Min_Nan')).toThrow(/slug/);
  });
});
