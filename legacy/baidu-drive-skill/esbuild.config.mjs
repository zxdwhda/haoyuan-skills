import { build, context } from 'esbuild';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const pkg = JSON.parse(
  readFileSync(resolve(__dirname, 'package.json'), 'utf-8'),
);

const watch = process.argv.includes('--watch');

const buildOptions = {
  entryPoints: [resolve(__dirname, 'src/pan.ts')],
  outfile: resolve(__dirname, 'skill/assets/dist/pan.cjs'),
  bundle: true,
  platform: 'node',
  target: 'node18',
  format: 'cjs',
  banner: {
    js: '#!/usr/bin/env node',
  },
  define: {
    __PKG_VERSION__: JSON.stringify(pkg.version),
    __PKG_NAME__: JSON.stringify(pkg.name),
  },
  minify: false,
  sourcemap: false,
  legalComments: 'none',
  logLevel: 'info',
};

if (watch) {
  const ctx = await context(buildOptions);
  await ctx.watch();
  console.log('[esbuild] watching for changes...');
} else {
  await build(buildOptions);
  console.log('[esbuild] built skill/assets/dist/pan.cjs');
}
