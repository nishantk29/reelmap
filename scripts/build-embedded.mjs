// Bundles the Worker and every file in dist/public into one ES module:
// dist-embedded/worker.js. Assets are inlined as base64 with a content-type map.
import { build } from 'esbuild';
import { readdir, readFile, stat } from 'node:fs/promises';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const publicDir = path.join(root, 'dist/public');
const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
  '.png': 'image/png',
  '.json': 'application/json',
};

async function* walk(dir) {
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) yield* walk(p);
    else yield p;
  }
}

await stat(path.join(publicDir, 'index.html')).catch(() => {
  throw new Error('Run "npm run build" first.');
});

const assets = {};
for await (const file of walk(publicDir)) {
  const key = '/' + path.relative(publicDir, file).split(path.sep).join('/');
  assets[key] = {
    type: TYPES[path.extname(file)] ?? 'application/octet-stream',
    body: (await readFile(file)).toString('base64'),
  };
}

const virtual = {
  name: 'embedded-assets',
  setup(b) {
    b.onResolve({ filter: /^reelmap:embedded-assets$/ }, (args) => ({ path: args.path, namespace: 'embedded' }));
    b.onLoad({ filter: /.*/, namespace: 'embedded' }, () => ({
      contents: `export const ASSETS = ${JSON.stringify(assets)};`,
      loader: 'js',
    }));
  },
};

const result = await build({
  absWorkingDir: root,
  entryPoints: ['src/worker/embedded.ts'],
  bundle: true,
  format: 'esm',
  platform: 'neutral',
  target: 'es2022',
  minify: true,
  outfile: 'dist-embedded/worker.js',
  plugins: [virtual],
  metafile: true,
  legalComments: 'none',
  logLevel: 'warning',
});
const bytes = Object.values(result.metafile.outputs)[0].bytes;
console.log(`dist-embedded/worker.js ${(bytes / 1024).toFixed(1)} kB, ${Object.keys(assets).length} assets inlined`);
