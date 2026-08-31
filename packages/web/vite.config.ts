import { defineConfig } from 'vite';

export default defineConfig({
  root: '.',
  // Serves the repo-root data/ directory (data/raamattu.csv) as static
  // assets at the site root, e.g. /raamattu.csv -- avoids duplicating the
  // ~5.3MB Bible CSV inside packages/web.
  publicDir: '../../data',
});
