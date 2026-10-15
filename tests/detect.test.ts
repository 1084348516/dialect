import { describe, it, expect } from 'vitest';
import { chooseLang } from '../src/i18n/detect';

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0 Safari/537.36';

describe('chooseLang', () => {
  it('maps simplified Chinese locales to zh-hans', () => {
    for (const l of ['zh-CN', 'zh-SG', 'zh', 'zh-Hans', 'zh-Hans-HK', 'zh-cn']) expect(chooseLang(null, [l], UA)).toBe('zh-hans');
  });

  it('maps traditional Chinese locales to zh-hant', () => {
    for (const l of ['zh-TW', 'zh-HK', 'zh-MO', 'zh-Hant', 'zh-Hant-CN', 'zh-tw']) expect(chooseLang(null, [l], UA)).toBe('zh-hant');
  });

  it('maps any other language to en', () => {
    for (const l of ['en-US', 'ja', 'fr-FR']) expect(chooseLang(null, [l], UA)).toBe('en');
  });

  it('follows only the first preferred language', () => {
    expect(chooseLang(null, ['en-US', 'zh-CN'], UA)).toBe('en');
    expect(chooseLang(null, ['zh-TW', 'en'], UA)).toBe('zh-hant');
  });

  it('stays on zh-hans when the browser reports no language', () => {
    expect(chooseLang(null, [], UA)).toBe('zh-hans');
  });

  it('prefers a language the visitor picked before', () => {
    expect(chooseLang('zh-hans', ['en-US'], UA)).toBe('zh-hans');
    expect(chooseLang('en', ['zh-CN'], UA)).toBe('en');
    expect(chooseLang('zh-hant', ['zh-CN'], UA)).toBe('zh-hant');
  });

  it('ignores an unknown stored value', () => {
    expect(chooseLang('fr', ['zh-TW'], UA)).toBe('zh-hant');
  });

  it('never moves crawlers off zh-hans', () => {
    for (const ua of [
      'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
      'Mozilla/5.0 (compatible; Baiduspider/2.0; +http://www.baidu.com/search/spider.html)',
      'Mozilla/5.0 (compatible; bingbot/2.0; +http://www.bing.com/bingbot.htm)',
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome-Lighthouse',
      'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/141.0 Safari/537.36',
    ]) expect(chooseLang(null, ['en-US'], ua)).toBe('zh-hans');
  });

  it('is self-contained so it can be inlined into a page script', () => {
    const inlined = new Function(`return (${chooseLang.toString()})`)() as typeof chooseLang;
    expect(inlined(null, ['zh-HK'], UA)).toBe('zh-hant');
  });
});
