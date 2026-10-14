import { describe, it, expect } from 'vitest';
import { ui, t } from '../src/i18n/ui';

const placeholders = (s: string) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();

describe('ui strings', () => {
  it('has the same non-empty keys and placeholders in every language', () => {
    const keys = Object.keys(ui['zh-hans']).sort();
    for (const lang of ['zh-hant', 'en'] as const) {
      expect(Object.keys(ui[lang]).sort()).toEqual(keys);
      for (const k of keys) {
        const v = ui[lang][k as keyof (typeof ui)['en']];
        expect(v.trim(), `${lang}.${k}`).not.toBe('');
        expect(placeholders(v), `${lang}.${k}`).toEqual(placeholders(ui['zh-hans'][k as keyof (typeof ui)['en']]));
      }
    }
  });

  it('converts zh-hant strings', () => {
    expect(ui['zh-hant'].chooseDialect).toBe('選擇方言');
  });

  it('interpolates variables and leaves unknown placeholders', () => {
    expect(t('zh-hans', 'entryCount', { n: 7 })).toBe('7 条词条');
    expect(t('en', 'searchPlaceholderDialect', { dialect: 'Hokkien' })).toBe('Search Hokkien');
    expect(t('en', 'searchPlaceholderDialect')).toBe('Search {dialect}');
  });
});
