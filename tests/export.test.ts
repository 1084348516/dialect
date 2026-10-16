import { describe, it, expect } from 'vitest';
import { parseIds, idsQuery, paginate, wrapLines, toCardEntry, fileName } from '../src/lib/export';
import { makeDialect } from './fixtures';

const valid = ['a-ma', 'a-kong', 'to-sia'];
// 每个字符宽 10，便于推算换行
const measure = (s: string) => s.length * 10;

describe('export ids', () => {
  it('keeps known ids in the given order without duplicates', () => {
    expect(parseIds('?ids=to-sia,a-ma,to-sia', valid)).toEqual(['to-sia', 'a-ma']);
  });

  it('ignores unknown, empty or missing ids', () => {
    expect(parseIds('?ids=nope,,a-kong', valid)).toEqual(['a-kong']);
    expect(parseIds('?ids=', valid)).toEqual([]);
    expect(parseIds('', valid)).toEqual([]);
  });

  it('builds a query string that round-trips', () => {
    expect(idsQuery([])).toBe('');
    expect(idsQuery(['a-ma', 'to-sia'])).toBe('?ids=a-ma,to-sia');
    expect(parseIds(idsQuery(['a-ma', 'to-sia']), valid)).toEqual(['a-ma', 'to-sia']);
  });
});

describe('paginate', () => {
  it('returns no pages for no items', () => {
    expect(paginate([], 6)).toEqual([]);
  });

  it('fits up to the max on one page', () => {
    expect(paginate([1, 2, 3, 4, 5, 6], 6)).toEqual([[1, 2, 3, 4, 5, 6]]);
  });

  it('splits evenly instead of leaving a short last page', () => {
    expect(paginate([1, 2, 3, 4, 5, 6, 7], 6)).toEqual([[1, 2, 3, 4], [5, 6, 7]]);
    expect(paginate([...Array(13).keys()], 6).map((p) => p.length)).toEqual([5, 4, 4]);
  });
});

describe('wrapLines', () => {
  it('keeps short text on one line', () => {
    expect(wrapLines('奶奶；祖母', 100, measure, 2)).toEqual(['奶奶；祖母']);
  });

  it('breaks Chinese between characters', () => {
    expect(wrapLines('一二三四五六七', 30, measure, 3)).toEqual(['一二三', '四五六', '七']);
  });

  it('breaks English between words and drops the space at line ends', () => {
    expect(wrapLines('have you eaten yet', 90, measure, 3)).toEqual(['have you', 'eaten yet']);
  });

  it('keeps romanized words with tone marks whole', () => {
    expect(wrapLines('guá tńg--lâi', 80, measure, 3)).toEqual(['guá', 'tńg--lâi']);
  });

  it('breaks a word that is longer than a line', () => {
    expect(wrapLines('abcdefgh', 30, measure, 5)).toEqual(['abc', 'def', 'gh']);
  });

  it('truncates with an ellipsis past the line limit', () => {
    expect(wrapLines('一二三四五六七', 30, measure, 2)).toEqual(['一二三', '四五…']);
  });
});

describe('toCardEntry', () => {
  const d = makeDialect();
  const aMa = d.entries.find((e) => e.id === 'a-ma')!;

  it('uses the Chinese gloss and homophone on Chinese pages', () => {
    expect(toCardEntry('zh-hans', aMa)).toEqual({ id: 'a-ma', text: '阿嬷', pron: 'a-má', sub: '谐音 阿妈', gloss: '奶奶；祖母' });
  });

  it('uses the English gloss and reading on English pages', () => {
    expect(toCardEntry('en', aMa)).toEqual({ id: 'a-ma', text: '阿嬷', pron: 'a-má', sub: 'sounds like ah-MAH', gloss: 'grandma' });
  });

  it('falls back when optional fields are missing', () => {
    const bare = { ...aMa, homophone: undefined, enReading: undefined, en: undefined };
    expect(toCardEntry('zh-hans', bare).sub).toBeUndefined();
    expect(toCardEntry('en', bare)).toMatchObject({ sub: undefined, gloss: '奶奶；祖母' });
  });
});

describe('fileName', () => {
  it('numbers files only when there are several', () => {
    expect(fileName('minnan', 0, 1)).toBe('familect-minnan.png');
    expect(fileName('minnan', 1, 3)).toBe('familect-minnan-2.png');
  });
});
