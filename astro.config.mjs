import { defineConfig } from 'astro/config';
import node from '@astrojs/node';
import tailwind from '@astrojs/tailwind';

export default defineConfig({
  site: 'https://truffe.info',
  output: 'server',
  adapter: node({ mode: 'standalone' }),
  integrations: [tailwind()],
  i18n: {
    defaultLocale: 'it',
    locales: ['it'],
  },
});
