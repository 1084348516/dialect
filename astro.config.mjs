import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: process.env.SITE_URL ?? 'https://familect.org',
  // 'always' 会让开发模式下 /search/*.json 必须带结尾斜杠，导致搜索索引 404；页面仍按目录输出，网址照样以 / 结尾
  trailingSlash: 'ignore',
  build: { format: 'directory' },
  devToolbar: { enabled: false },
  integrations: [
    sitemap({
      filter: (page) => !page.includes('/404') && !page.endsWith('/export/'),
      i18n: {
        defaultLocale: 'zh-hans',
        locales: { 'zh-hans': 'zh-Hans', 'zh-hant': 'zh-Hant', en: 'en' },
      },
    }),
  ],
});
