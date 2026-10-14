import { describe, it, expect } from 'vitest';
import { parseFilter, matchesFilter, filterQuery } from '../src/lib/filter';

const cats = ['kinship', 'greeting'];
const regions = ['tw', 'xm'];

describe('filter', () => {
  it('parses known params', () => {
    expect(parseFilter('?cat=kinship&region=tw', cats, regions)).toEqual({ cat: 'kinship', region: 'tw' });
  });

  it('ignores unknown, empty or missing params', () => {
    expect(parseFilter('?cat=nope&region=xx', cats, regions)).toEqual({ cat: undefined, region: undefined });
    expect(parseFilter('?cat=&region=', cats, regions)).toEqual({ cat: undefined, region: undefined });
    expect(parseFilter('', cats, regions)).toEqual({ cat: undefined, region: undefined });
  });

  it('matches by category and region; entries without regions match any region', () => {
    expect(matchesFilter({ cat: 'kinship', regions: [] }, {})).toBe(true);
    expect(matchesFilter({ cat: 'kinship', regions: [] }, { cat: 'greeting' })).toBe(false);
    expect(matchesFilter({ cat: 'kinship', regions: [] }, { region: 'tw' })).toBe(true);
    expect(matchesFilter({ cat: 'kinship', regions: ['xm'] }, { region: 'tw' })).toBe(false);
    expect(matchesFilter({ cat: 'kinship', regions: ['xm', 'tw'] }, { cat: 'kinship', region: 'tw' })).toBe(true);
  });

  it('builds a query string', () => {
    expect(filterQuery({})).toBe('');
    expect(filterQuery({ cat: 'kinship' })).toBe('?cat=kinship');
    expect(filterQuery({ cat: 'kinship', region: 'tw' })).toBe('?cat=kinship&region=tw');
  });
});
