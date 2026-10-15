import { describe, it, expect } from 'vitest';
import { buildSearchRecords } from '../src/lib/search-index';
import { searchIndex } from '../src/lib/search';
import { makeDialect } from './fixtures';

describe('buildSearchRecords', () => {
  const minnan = makeDialect();
  const soon = makeDialect({ status: 'soon' }, 'hakka');

  it('includes every entry of live dialects only', () => {
    const recs = buildSearchRecords([minnan, soon], 'zh-hans');
    expect(recs.map((r) => r.id)).toEqual(['a-ma', 'a-kong', 'to-sia']);
    expect(recs.every((r) => r.dialect === 'minnan')).toBe(true);
  });

  it('uses language-specific urls and dialect names', () => {
    const zh = buildSearchRecords([minnan], 'zh-hans')[0];
    expect(zh.url).toBe('/minnan/a-ma/');
    expect(zh.dialectName).toBe('闽南语');
    const en = buildSearchRecords([minnan], 'en')[0];
    expect(en.url).toBe('/en/minnan/a-ma/');
    expect(en.dialectName).toBe('Hokkien');
    expect(en.keys).toContain('ama');
  });

  it('handles entries without homophone or English gloss', () => {
    const bare = { id: 'bare', text: '多谢', pron: 'to-siā', zh: '谢谢', category: 'greeting' };
    const d = makeDialect({ entries: [bare] });
    const [rec] = buildSearchRecords([d], 'en');
    expect(rec.en).toBeUndefined();
    expect(searchIndex([rec], '谢谢').map((r) => r.id)).toEqual(['bare']);
  });
});

describe('cross-script search', () => {
  const minnan = makeDialect();
  const ids = (lang: 'zh-hans' | 'zh-hant', q: string) => searchIndex(buildSearchRecords([minnan], lang), q).map((r) => r.id);

  it('finds headwords typed in Traditional on the simplified index', () => {
    expect(ids('zh-hans', '多謝')).toEqual(['to-sia']);
    expect(ids('zh-hans', '謝謝')).toEqual(['to-sia']);
  });

  it('finds headwords typed in either script on the traditional index', () => {
    expect(ids('zh-hant', '多謝')).toEqual(['to-sia']);
    expect(ids('zh-hant', '多谢')).toEqual(['to-sia']);
    expect(ids('zh-hant', '谢谢')).toEqual(['to-sia']);
  });
});
