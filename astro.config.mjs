// @ts-check
import { defineConfig } from 'astro/config';

import sitemap from '@astrojs/sitemap';

// https://astro.build/config
export default defineConfig({
  site: 'https://suzu-shika.com',
  integrations: [sitemap({serialize(item) { if (/\/works\/[^/]+\/$/.test(item.url) && !/\/works\/\d+\/$/.test(item.url)) item.url=item.url.replace(/\/$/, ""); return item; }})]
});