import { describe, it, expect } from 'vitest';
import { normalize, buildKeys, searchIndex, type SearchRecord } from '../src/lib/search';

const rec = (id: string, dialect: string, e: Parameters<typeof buildKeys>[0]): SearchRecord => ({
  dialect, dialectName: dialect, id, url: `/${dialect}/${id}/`, text: e.text, pron: e.pron, zh: e.zh, en: e.en, keys: buildKeys(e),
});

const index = [
  rec('a-ma', 'minnan', { text: '阿嬷', alt: ['阿嫲'], pron: 'a-má', homophone: '阿妈', zh: '奶奶；祖母', en: 'grandma' }),
  rec('tsiah-pa-bue', 'minnan', { text: '食饱未', alt: [], pron: 'tsia̍h-pá--buē', homophone: '甲饱没', zh: '吃饱了吗', en: 'have you eaten?' }),
  rec('maa-maa', 'cantonese', { text: '嫲嫲', alt: [], pron: 'maa4 maa4', homophone: '麻麻', zh: '奶奶；祖母', en: 'grandma' }),
  rec('sik-zo-faan-mei', 'cantonese', { text: '食咗饭未', alt: [], pron: 'sik6 zo2 faan6 mei6', homophone: '色左饭未', zh: '吃饭了吗？', en: 'have you eaten yet?' }),
];

describe('normalize', () => {
  it('strips tone marks, tone digits, hyphens, spaces and punctuation; lowercases', () => {
    expect(normalize('tsia̍h-pá--buē')).toBe('tsiahpabue');
    expect(normalize('sik6 zo2')).toBe('sikzo');
    expect(normalize('A-má')).toBe('ama');
    expect(normalize('吃饭了吗？')).toBe('吃饭了吗');
  });

  it('returns empty for punctuation, whitespace or digits only', () => {
    expect(normalize('  ')).toBe('');
    expect(normalize('6')).toBe('');
    expect(normalize('？！')).toBe('');
  });
});

describe('buildKeys', () => {
  it('splits zh and en glosses into parts', () => {
    const keys = buildKeys({ text: '阿嬷', alt: [], pron: 'a-má', homophone: '阿妈', zh: '奶奶；祖母', en: 'sorry / paiseh' });
    expect(keys).toContain('奶奶');
    expect(keys).toContain('祖母');
    expect(keys).toContain('paiseh');
  });

  it('skips missing homophone and English gloss', () => {
    expect(buildKeys({ text: '多谢', alt: [], pron: 'to-siā', zh: '谢谢' })).toEqual(['多谢', 'tosia', '谢谢']);
  });
});

describe('searchIndex', () => {
  const ids = (q: string, opts?: { dialect?: string; limit?: number }) => searchIndex(index, q, opts).map((r) => r.id);

  it('finds by romanization without tones', () => {
    // "maamaa" 也包含 "ama"，但完全匹配的 a-ma 排在前面
    expect(ids('ama')).toEqual(['a-ma', 'maa-maa']);
    expect(ids('tsiahpa')).toEqual(['tsiah-pa-bue']);
    expect(ids('sik zo')).toEqual(['sik-zo-faan-mei']);
  });

  it('finds by Chinese, homophone, alt and English', () => {
    expect(ids('奶奶')).toEqual(['a-ma', 'maa-maa']);
    expect(ids('阿妈')).toEqual(['a-ma']);
    expect(ids('阿嫲')).toEqual(['a-ma']);
    expect(ids('Grandma')).toEqual(['a-ma', 'maa-maa']);
  });

  it('ranks exact > prefix > contains, then index order', () => {
    // 嫲：maa-maa 的原文「嫲嫲」是前缀匹配（2 分），a-ma 的也写作「阿嫲」只是包含（1 分），所以排名高于索引顺序
    expect(ids('嫲')).toEqual(['maa-maa', 'a-ma']);
    // 同分时保持索引顺序
    expect(ids('eaten')).toEqual(['tsiah-pa-bue', 'sik-zo-faan-mei']);
    expect(ids('吃饱')).toEqual(['tsiah-pa-bue']);
  });

  it('filters by dialect and limits results', () => {
    expect(ids('grandma', { dialect: 'cantonese' })).toEqual(['maa-maa']);
    expect(ids('grandma', { limit: 1 })).toEqual(['a-ma']);
  });

  it('returns nothing for empty-after-normalize queries', () => {
    expect(ids('')).toEqual([]);
    expect(ids('   ')).toEqual([]);
    expect(ids('6')).toEqual([]);
    expect(ids('？')).toEqual([]);
  });
});
