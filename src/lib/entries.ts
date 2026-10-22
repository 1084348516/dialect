import type { Category, Dialect, Entry } from './schema';

export function categoryEntries(d: Dialect, categoryId: string): Entry[] {
  return d.entries.filter((e) => e.category === categoryId);
}

/** 有词条的分类，只给这些生成分类页 */
export function usedCategories(d: Dialect): Category[] {
  return d.categories.filter((c) => d.entries.some((e) => e.category === c.id));
}

export function relatedEntries(d: Dialect, entry: Entry, max = 6): Entry[] {
  return d.entries.filter((e) => e.category === entry.category && e.id !== entry.id).slice(0, max);
}

export function neighbors(d: Dialect, entryId: string): { prev?: Entry; next?: Entry } {
  const i = d.entries.findIndex((e) => e.id === entryId);
  if (i < 0) return { prev: undefined, next: undefined };
  return { prev: d.entries[i - 1], next: d.entries[i + 1] };
}

export function isCaution(d: Dialect, entry: Entry): boolean {
  return d.categories.some((c) => c.id === entry.category && c.caution);
}
