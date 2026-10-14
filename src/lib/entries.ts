import type { Category, Dialect, Entry } from './schema';

export function relatedEntries(d: Dialect, entry: Entry, max = 6): Entry[] {
  return d.entries.filter((e) => e.category === entry.category && e.id !== entry.id).slice(0, max);
}

export function neighbors(d: Dialect, entryId: string): { prev?: Entry; next?: Entry } {
  const i = d.entries.findIndex((e) => e.id === entryId);
  if (i < 0) return { prev: undefined, next: undefined };
  return { prev: d.entries[i - 1], next: d.entries[i + 1] };
}

export function featuredEntries(dialects: Dialect[], max = 4): { dialect: Dialect; entry: Entry }[] {
  return dialects
    .filter((d) => d.status === 'live')
    .flatMap((d) => d.entries.filter((e) => e.featured).map((entry) => ({ dialect: d, entry })))
    .slice(0, max);
}

/** 首页「按场景查」：按分类 id 去重，跳过慎用分类和没有词条的分类。 */
export function sceneLinks(dialects: Dialect[]): { category: Category; dialectId: string }[] {
  const seen = new Set<string>();
  const out: { category: Category; dialectId: string }[] = [];
  for (const d of dialects) {
    if (d.status !== 'live') continue;
    for (const c of d.categories) {
      if (c.caution || seen.has(c.id) || !d.entries.some((e) => e.category === c.id)) continue;
      seen.add(c.id);
      out.push({ category: c, dialectId: d.id });
    }
  }
  return out;
}

export function isCaution(d: Dialect, entry: Entry): boolean {
  return d.categories.some((c) => c.id === entry.category && c.caution);
}
