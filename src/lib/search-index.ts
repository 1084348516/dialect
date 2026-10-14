import { toHans, toHant } from '../i18n/convert';
import { entryPath, pick, type Lang } from '../i18n/langs';
import type { Dialect, Entry } from './schema';
import { buildKeys, type SearchRecord } from './search';

/** 构建时把繁简两种写法都放进匹配键，用户用哪种字形输入都能搜到（opencc 不进客户端包）。 */
function crossScriptKeys(e: Entry): string[] {
  const variant = (conv: (s: string) => string) => ({
    text: conv(e.text), alt: e.alt.map(conv), pron: e.pron, homophone: conv(e.homophone), zh: conv(e.zh), en: e.en,
  });
  return [...new Set([...buildKeys(e), ...buildKeys(variant(toHant)), ...buildKeys(variant(toHans))])];
}

export function buildSearchRecords(dialects: Dialect[], lang: Lang): SearchRecord[] {
  return dialects
    .filter((d) => d.status === 'live')
    .flatMap((d) =>
      d.entries.map((e) => ({
        dialect: d.id,
        dialectName: pick(lang, d.name, d.nameEn),
        id: e.id,
        url: entryPath(lang, d.id, e.id),
        text: e.text,
        pron: e.pron,
        zh: e.zh,
        en: e.en,
        keys: crossScriptKeys(e),
      })),
    );
}
