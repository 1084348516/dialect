import { describe, it, expect } from 'vitest';
import { readdirSync } from 'node:fs';
import { join } from 'node:path';
import { INFO_PAGES, CONTACT_EMAIL, info } from '../src/i18n/info';

const shape = (lang: keyof typeof info) =>
  INFO_PAGES.map((p) => info[lang][p].sections.map((s) => [!!s.heading, s.body.map((b) => (Array.isArray(b) ? b.length : 0))]));

describe('info pages', () => {
  it('has the same sections in every language', () => {
    expect(shape('en')).toEqual(shape('zh-hans'));
    expect(shape('zh-hant')).toEqual(shape('zh-hans'));
  });

  it('converts zh-hant text', () => {
    expect(info['zh-hant'].privacy.title).toBe('隱私政策');
    expect(info['zh-hant'].contact.nav).toBe('聯繫我們');
  });

  it('shows the contact email on the contact page in every language', () => {
    for (const lang of ['zh-hans', 'zh-hant', 'en'] as const) {
      expect(JSON.stringify(info[lang].contact.sections)).toContain(`mailto:${CONTACT_EMAIL}`);
    }
  });

  it('mentions Google advertising cookies in the privacy policy', () => {
    for (const lang of ['zh-hans', 'en'] as const) {
      const text = JSON.stringify(info[lang].privacy.sections);
      expect(text).toContain('Google AdSense');
      expect(text).toContain('policies.google.com/technologies/partner-sites');
    }
  });

  it('does not share a URL with any dialect', () => {
    const ids = readdirSync(join(process.cwd(), 'src/content/dialects')).map((f) => f.replace(/\.yaml$/, ''));
    for (const p of INFO_PAGES) expect(ids).not.toContain(p);
  });
});
