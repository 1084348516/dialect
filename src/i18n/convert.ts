import * as OpenCC from 'opencc-js';
import type { Dialect, Entry } from '../lib/schema';
import type { Lang } from './langs';

const cn2tw = OpenCC.Converter({ from: 'cn', to: 'tw' });
const tw2cn = OpenCC.Converter({ from: 'tw', to: 'cn' });

export function toHant(s: string): string {
  return cn2tw(s);
}

export function toHans(s: string): string {
  return tw2cn(s);
}

/** 方言原文显示用的字形：繁体页用繁体；粤语这类使用者主要写繁体的方言（traditional），英文页也用繁体 */
export function headword(lang: Lang, d: Pick<Dialect, 'traditional'>, e: Pick<Entry, 'text' | 'textHant'>): string {
  return lang === 'zh-hant' || (lang === 'en' && d.traditional) ? (e.textHant ?? toHant(e.text)) : e.text;
}

const opt = (s: string | undefined) => (s === undefined ? undefined : toHant(s));

/** 繁体版只转换中文说明类字段；方言原文、谐音、拼音、英文保持原样。 */
export function localizeDialect(d: Dialect, lang: Lang): Dialect {
  if (lang !== 'zh-hant') return d;
  return {
    ...d,
    name: d.nameHant ?? toHant(d.name),
    areas: toHant(d.areas),
    intro: opt(d.intro),
    romanization: d.romanization && { ...d.romanization, name: toHant(d.romanization.name) },
    regions: d.regions.map((r) => ({ ...r, name: toHant(r.name) })),
    categories: d.categories.map((c) => ({ ...c, name: toHant(c.name) })),
    entries: d.entries.map((e) => ({
      ...e,
      zh: toHant(e.zh),
      meaning: opt(e.meaning),
      literal: opt(e.literal),
      note: opt(e.note),
      examples: e.examples.map((x) => ({ ...x, zh: toHant(x.zh) })),
      variants: e.variants.map((v) => ({ ...v, region: toHant(v.region), note: opt(v.note) })),
    })),
  };
}
