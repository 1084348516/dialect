import { describe, it, expect } from 'vitest';
import { toHant, localizeDialect } from '../src/i18n/convert';
import { makeDialect } from './fixtures';

describe('toHant', () => {
  it('converts simplified to Taiwan traditional', () => {
    expect(toHant('亲属称谓')).toBe('親屬稱謂');
    expect(toHant('闽南语')).toBe('閩南語');
  });
});

describe('localizeDialect', () => {
  const d = makeDialect();

  it('returns the same object for zh-hans and en', () => {
    expect(localizeDialect(d, 'zh-hans')).toBe(d);
    expect(localizeDialect(d, 'en')).toBe(d);
  });

  it('converts Chinese prose fields for zh-hant', () => {
    const h = localizeDialect(d, 'zh-hant');
    expect(h.name).toBe('閩南語');
    expect(h.categories[0].name).toBe('親屬稱謂');
    expect(h.regions[0].name).toBe('臺灣');
    expect(h.romanization?.name).toBe('臺羅拼音');
    expect(h.entries[0].zh).toBe('奶奶；祖母');
    expect(h.entries[0].meaning).toBe('奶奶，父親的母親。');
    expect(h.entries[0].note).toBe('外婆一般叫外嬤。');
    expect(h.entries[0].examples[0].zh).toBe('奶奶，我回來了。');
    expect(h.entries[0].variants[0].note).toBe('最常見的寫法');
  });

  it('never converts dialect text, alt, homophone, romanization or English', () => {
    const e = localizeDialect(d, 'zh-hant').entries[0];
    expect(e.text).toBe('阿嬷');
    expect(e.alt).toEqual(['阿嫲']);
    expect(e.homophone).toBe('阿妈');
    expect(e.pron).toBe('a-má');
    expect(e.en).toBe('grandma');
    expect(e.examples[0].text).toBe('阿嬷，我转来矣。');
  });

  it('does not mutate the input', () => {
    localizeDialect(d, 'zh-hant');
    expect(d.name).toBe('闽南语');
  });
});
