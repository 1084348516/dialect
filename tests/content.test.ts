import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parse } from 'yaml';
import { dialectSchema, assertDialectId } from '../src/lib/schema';

const dir = join(process.cwd(), 'src/content/dialects');
const files = readdirSync(dir).filter((f) => f.endsWith('.yaml'));

describe('content files', () => {
  it('has at least one live dialect', () => {
    const live = files.filter((f) => parse(readFileSync(join(dir, f), 'utf8')).status === 'live');
    expect(live.length).toBeGreaterThan(0);
  });

  it.each(files)('%s is valid', (file) => {
    assertDialectId(file.replace(/\.yaml$/, ''));
    const r = dialectSchema.safeParse(parse(readFileSync(join(dir, file), 'utf8')));
    expect(r.success ? [] : r.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`)).toEqual([]);
  });
});
