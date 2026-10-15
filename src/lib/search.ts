export interface SearchRecord {
  dialect: string;
  dialectName: string;
  id: string;
  url: string;
  text: string;
  pron: string;
  zh: string;
  en?: string;
  keys: string[];
}

/** 去掉声调符号（组合附加符号）、声调数字、空格、连字符、标点和符号，再转成小写。 */
export function normalize(s: string): string {
  return s
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[\s\p{P}\p{S}0-9]/gu, '');
}

const splitGloss = (s = '') => [s, ...s.split(/[；;，,、/]/)];

export function buildKeys(e: { text: string; alt: string[]; pron: string; homophone?: string; zh: string; en?: string }): string[] {
  const raw = [e.text, ...e.alt, e.pron, e.homophone ?? '', ...splitGloss(e.zh), ...splitGloss(e.en)];
  return [...new Set(raw.map(normalize).filter(Boolean))];
}

function score(keys: string[], q: string): number {
  let best = 0;
  for (const k of keys) {
    if (k === q) return 3;
    if (k.startsWith(q)) best = Math.max(best, 2);
    else if (k.includes(q)) best = Math.max(best, 1);
  }
  return best;
}

export function searchIndex(index: SearchRecord[], query: string, opts: { dialect?: string; limit?: number } = {}): SearchRecord[] {
  const q = normalize(query);
  if (!q) return [];
  const { dialect, limit = 10 } = opts;
  return index
    .map((r, i) => ({ r, i, s: !dialect || r.dialect === dialect ? score(r.keys, q) : 0 }))
    .filter((x) => x.s > 0)
    .sort((a, b) => b.s - a.s || a.i - b.i)
    .slice(0, limit)
    .map((x) => x.r);
}
