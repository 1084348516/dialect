import type { Lang } from './langs';

// 访客第一次打开简体页面时用来决定显示哪种语言。
// 会被 toString() 内联进页面 <head>，所以函数体不能引用外部变量。
export function chooseLang(stored: string | null, languages: readonly string[], ua: string): Lang {
  if (stored === 'zh-hans' || stored === 'zh-hant' || stored === 'en') return stored;
  if (/bot|crawl|spider|slurp|lighthouse|headless/i.test(ua)) return 'zh-hans';
  const first = (languages[0] || '').toLowerCase();
  if (!first) return 'zh-hans';
  if (first !== 'zh' && first.indexOf('zh-') !== 0) return 'en';
  if (first.indexOf('-hant') > 0) return 'zh-hant';
  if (first.indexOf('-hans') > 0) return 'zh-hans';
  return /-(tw|hk|mo)\b/.test(first) ? 'zh-hant' : 'zh-hans';
}
