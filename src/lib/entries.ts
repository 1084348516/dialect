import type { Dialect, Entry } from './schema';

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

export function isCaution(d: Dialect, entry: Entry): boolean {
  return d.categories.some((c) => c.id === entry.category && c.caution);
}
