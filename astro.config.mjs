import { defineConfig } from 'astro/config';
import node from '@astrojs/node';
import tailwind from '@astrojs/tailwind';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('.', import.meta.url));

export default defineConfig({
  site: 'https://truffe.info',
  output: 'server',
  adapter: node({ mode: 'middleware' }),
  integrations: [
    tailwind(),
    {
      name: 'http-logger',
      hooks: {
        'astro:server:setup': async ({ server }) => {
          const { default: requestLogger } = await import('./src/lib/http-logger.ts');
          server.middlewares.use(requestLogger);
        },
      },
    },
  ],
  i18n: {
    defaultLocale: 'it',
    locales: ['it'],
  },
});
