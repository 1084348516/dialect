import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: process.env.SITE_URL ?? 'https://familect.pages.dev',
  trailingSlash: 'always',
  build: { format: 'directory' },
  integrations: [
    sitemap({
      filter: (page) => !page.includes('/404'),
      i18n: {
        defaultLocale: 'zh-hans',
        locales: { 'zh-hans': 'zh-Hans', 'zh-hant': 'zh-Hant', en: 'en' },
      },
    }),
  ],
});
