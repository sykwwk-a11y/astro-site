import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';

// https://astro.build/config
export default defineConfig({
  site: 'https://essence-design-office.com',
  integrations: [tailwind()],
  image: {
    responsiveStyles: true,
    breakpoints: [480, 640, 768, 1024, 1280, 1600],
  },
  server: {
    host: true,
    port: 4321,
  },
  vite: {
    server: {
      watch: {
        usePolling: true,
        interval: 300,
      },
    },
  },
});
