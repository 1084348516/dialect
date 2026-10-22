import { describe, it, expect } from 'vitest';
import { priority } from '../scripts/baidu-push.mjs';

const kinds = { categories: new Set(['minnan/kinship']), featured: new Set(['minnan/a-ma']) };
const order = (paths) => [...paths].sort((a, b) => priority(`https://familect.org${a}`, kinds) - priority(`https://familect.org${b}`, kinds));

describe('baidu push priority', () => {
  it('pushes home, dialect, category, featured entry, other entries, then info pages', () => {
    const paths = ['/about/', '/minnan/a-kong/', '/minnan/a-ma/', '/minnan/kinship/', '/minnan/', '/'];
    expect(order(paths)).toEqual(['/', '/minnan/', '/minnan/kinship/', '/minnan/a-ma/', '/minnan/a-kong/', '/about/']);
  });

  it('pushes all simplified pages before traditional, and English last', () => {
    expect(order(['/en/', '/zh-hant/minnan/kinship/', '/minnan/a-kong/'])).toEqual(['/minnan/a-kong/', '/zh-hant/minnan/kinship/', '/en/']);
  });
});
