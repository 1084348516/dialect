import { describe, it, expect } from 'vitest';
import { relatedEntries, neighbors, featuredEntries, sceneLinks, isCaution } from '../src/lib/entries';
import { makeDialect, rawMinnan } from './fixtures';

const minnan = makeDialect();
const crudeEntry = { id: 'tsiah-sai', text: '食屎', pron: 'tsia̍h-sái', homophone: '呷赛', enReading: 'jee-ah SAI', zh: '骂人', en: 'crude insult', category: 'crude' };

describe('entries helpers', () => {
  it('relatedEntries returns other entries in the same category', () => {
    expect(relatedEntries(minnan, minnan.entries[0]).map((e) => e.id)).toEqual(['a-kong']);
    expect(relatedEntries(minnan, minnan.entries[2])).toEqual([]);
  });

  it('relatedEntries respects max', () => {
    expect(relatedEntries(minnan, minnan.entries[0], 0)).toEqual([]);
  });

  it('neighbors follows YAML order', () => {
    expect(neighbors(minnan, 'a-ma')).toEqual({ prev: undefined, next: minnan.entries[1] });
    expect(neighbors(minnan, 'a-kong')).toEqual({ prev: minnan.entries[0], next: minnan.entries[2] });
    expect(neighbors(minnan, 'to-sia').next).toBeUndefined();
  });

  it('featuredEntries only uses live dialects, in order', () => {
    const soon = makeDialect({ status: 'soon' }, 'hakka');
    expect(featuredEntries([minnan, soon]).map((f) => `${f.dialect.id}/${f.entry.id}`)).toEqual(['minnan/a-ma', 'minnan/to-sia']);
    expect(featuredEntries([minnan], 1)).toHaveLength(1);
  });

  it('sceneLinks dedupes by category id, skips caution and empty categories', () => {
    const withCrude = makeDialect({ entries: [...rawMinnan.entries, crudeEntry] });
    const canto = makeDialect({ name: '粤语' }, 'cantonese');
    const links = sceneLinks([withCrude, canto]);
    expect(links.map((l) => `${l.category.id}@${l.dialectId}`)).toEqual(['kinship@minnan', 'greeting@minnan']);
  });

  it('isCaution reads the category flag', () => {
    const withCrude = makeDialect({ entries: [...rawMinnan.entries, crudeEntry] });
    expect(isCaution(withCrude, withCrude.entries[3])).toBe(true);
    expect(isCaution(withCrude, withCrude.entries[0])).toBe(false);
  });
});
