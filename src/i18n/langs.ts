export const LANGS = ['zh-hans', 'zh-hant', 'en'] as const;
export type Lang = (typeof LANGS)[number];
export const DEFAULT_LANG: Lang = 'zh-hans';

export const HTML_LANG: Record<Lang, string> = { 'zh-hans': 'zh-Hans', 'zh-hant': 'zh-Hant', en: 'en' };
export const LANG_LABEL: Record<Lang, string> = { 'zh-hans': '简', 'zh-hant': '繁', en: 'EN' };
export const LANG_STORAGE_KEY = 'familect-lang';

export function prefix(lang: Lang): string {
  return lang === DEFAULT_LANG ? '' : `/${lang}`;
}

export function homePath(lang: Lang): string {
  return `${prefix(lang)}/`;
}

export function dialectPath(lang: Lang, dialectId: string): string {
  return `${prefix(lang)}/${dialectId}/`;
}

export function entryPath(lang: Lang, dialectId: string, entryId: string): string {
  return `${prefix(lang)}/${dialectId}/${entryId}/`;
}

export function pick<T>(lang: Lang, zh: T, en: T): T {
  return lang === 'en' ? en : zh;
}
