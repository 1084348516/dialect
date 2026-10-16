import { describe, it, expect } from 'vitest';
import { LANGS, HTML_LANG, prefix, homePath, dialectPath, entryPath, exportPath, pick, glossLine } from '../src/i18n/langs';

describe('langs', () => {
  it('lists three languages with html lang codes', () => {
    expect(LANGS).toEqual(['zh-hans', 'zh-hant', 'en']);
    expect(HTML_LANG).toEqual({ 'zh-hans': 'zh-Hans', 'zh-hant': 'zh-Hant', en: 'en' });
  });

  it('builds paths with prefixes only for non-default languages', () => {
    expect(prefix('zh-hans')).toBe('');
    expect(homePath('zh-hans')).toBe('/');
    expect(homePath('zh-hant')).toBe('/zh-hant/');
    expect(dialectPath('en', 'minnan')).toBe('/en/minnan/');
    expect(entryPath('zh-hans', 'minnan', 'a-ma')).toBe('/minnan/a-ma/');
    expect(entryPath('zh-hant', 'minnan', 'a-ma')).toBe('/zh-hant/minnan/a-ma/');
    expect(exportPath('zh-hans', 'minnan')).toBe('/minnan/export/');
    expect(exportPath('en', 'minnan')).toBe('/en/minnan/export/');
  });

  it('joins glosses with the page language first and drops a missing English gloss', () => {
    expect(glossLine('zh-hans', '谢谢', 'thank you')).toBe('谢谢 · thank you');
    expect(glossLine('en', '谢谢', 'thank you')).toBe('thank you · 谢谢');
    expect(glossLine('zh-hant', '谢谢')).toBe('谢谢');
    expect(glossLine('en', '谢谢', undefined)).toBe('谢谢');
  });

  it('picks the English value only for en', () => {
    expect(pick('zh-hans', '奶奶', 'grandma')).toBe('奶奶');
    expect(pick('zh-hant', '奶奶', 'grandma')).toBe('奶奶');
    expect(pick('en', '奶奶', 'grandma')).toBe('grandma');
  });
});
