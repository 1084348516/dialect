import { t } from '../i18n/ui';
import type { Lang } from '../i18n/langs';
import type { Entry } from './schema';

/** 小红书竖版 3:4 */
export const CARD_W = 1080;
export const CARD_H = 1440;
export const MAX_PER_CARD = 6;

export interface CardEntry {
  id: string;
  text: string;
  pron: string;
  sub?: string;
  gloss: string;
}

/** 读取 ?ids=a,b，只保留本方言存在的词条，按出现顺序去重。 */
export function parseIds(search: string, validIds: string[]): string[] {
  const raw = new URLSearchParams(search).get('ids') ?? '';
  const known = new Set(validIds);
  return [...new Set(raw.split(',').filter((id) => known.has(id)))];
}

/** 词条 id 都是 slug，逗号不必转义，网址更好看。 */
export function idsQuery(ids: string[]): string {
  return ids.length ? `?ids=${ids.join(',')}` : '';
}

/** 均匀分页：7 条按 4+3 分，而不是 6+1。 */
export function paginate<T>(items: T[], max = MAX_PER_CARD): T[][] {
  if (items.length === 0) return [];
  const pages = Math.ceil(items.length / max);
  const out: T[][] = [];
  let start = 0;
  for (let i = 0; i < pages; i++) {
    const size = Math.ceil((items.length - start) / (pages - i));
    out.push(items.slice(start, start + size));
    start += size;
  }
  return out;
}

/** 汉字和全角标点逐字切分，其余（英文、带声调的拼音）按词切分；单词本身超宽时再按字母切。 */
const TOKEN_RE = /[\p{Script=Han}　-〿＀-￯]|[^\s\p{Script=Han}　-〿＀-￯]+\s*|\s+/gu;
function tokens(text: string): string[] {
  return text.match(TOKEN_RE) ?? [];
}

/** Canvas 没有自动换行，这里按测得的宽度贪心排行，超出行数时末行加省略号。 */
export function wrapLines(text: string, maxWidth: number, measure: (s: string) => number, maxLines: number): string[] {
  const lines: string[] = [];
  let line = '';
  const push = () => {
    lines.push(line.trimEnd());
    line = '';
  };
  for (const tok of tokens(text)) {
    if (measure((line + tok).trimEnd()) <= maxWidth) {
      line += tok;
      continue;
    }
    if (line.trim()) push();
    if (measure(tok.trimEnd()) <= maxWidth) {
      line = tok.trimStart();
      continue;
    }
    for (const ch of tok) {
      if (line && measure((line + ch).trimEnd()) > maxWidth) push();
      line += ch;
    }
  }
  if (line.trim()) push();

  if (lines.length <= maxLines) return lines;
  const kept = lines.slice(0, maxLines);
  let last = kept[maxLines - 1];
  while (last && measure(`${last}…`) > maxWidth) last = last.slice(0, -1);
  kept[maxLines - 1] = `${last}…`;
  return kept;
}

/** 卡片上每个词显示的内容：中文页给谐音，英文页给英文读法。 */
export function toCardEntry(lang: Lang, e: Entry): CardEntry {
  const reading = lang === 'en' ? e.enReading : e.homophone;
  return {
    id: e.id,
    text: e.text,
    pron: e.pron,
    sub: reading ? `${t(lang, 'homophoneShort')} ${reading}` : undefined,
    gloss: (lang === 'en' ? e.en : undefined) ?? e.zh,
  };
}

export function fileName(dialectId: string, index: number, total: number): string {
  return total > 1 ? `familect-${dialectId}-${index + 1}.png` : `familect-${dialectId}.png`;
}
