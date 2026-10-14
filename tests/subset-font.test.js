import { describe, it, expect } from 'vitest';
import { collectChars } from '../scripts/subset-font.mjs';

describe('collectChars', () => {
  it('always includes printable ASCII', () => {
    const chars = collectChars([]);
    expect(chars).toContain('A');
    expect(chars).toContain('~');
    expect(chars).toContain(' ');
  });

  it('collects unique non-whitespace characters from texts', () => {
    const chars = collectChars(['阿嬷\n阿嬷', '閩南語 á']);
    for (const ch of ['阿', '嬷', '閩', '語', 'á']) expect(chars).toContain(ch);
    expect([...chars].filter((c) => c === '阿')).toHaveLength(1);
    expect(chars).not.toContain('\n');
  });
});
