// Builds the client into dist/public with hashed file names.
import { build } from 'esbuild';
import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const out = path.join(root, 'dist/public');
const dev = process.argv.includes('--dev');

await rm(out, { recursive: true, force: true });
await mkdir(out, { recursive: true });
await cp(path.join(root, 'public'), out, { recursive: true });

const result = await build({
  absWorkingDir: root,
  entryPoints: { app: 'src/client/main.ts', theme: 'src/client/theme-init.ts' },
  bundle: true,
  splitting: true,
  format: 'esm',
  target: ['es2022', 'safari16'],
  minify: !dev,
  sourcemap: false,
  outdir: path.join(out, 'assets'),
  entryNames: '[name]-[hash]',
  chunkNames: 'chunk-[hash]',
  assetNames: '[name]-[hash]',
  external: ['/fonts/*', '/img/*'],
  metafile: true,
  legalComments: 'none',
  logLevel: 'warning',
});

const outputs = Object.entries(result.metafile.outputs);
const find = (entry, ext) => {
  const hit = outputs.find(([file, o]) => o.entryPoint === entry && file.endsWith(ext)) ?? outputs.find(([file, o]) => o.cssBundle && file.endsWith(ext));
  if (!hit) throw new Error(`no output for ${entry}`);
  return '/' + path.relative(out, path.resolve(root, hit[0])).split(path.sep).join('/');
};
const app = find('src/client/main.ts', '.js');
const theme = find('src/client/theme-init.ts', '.js');
const appMeta = outputs.find(([f, o]) => o.entryPoint === 'src/client/main.ts' && f.endsWith('.js'))[1];
const css = '/' + path.relative(out, path.resolve(root, appMeta.cssBundle)).split(path.sep).join('/');

// theme-init must run before paint, so it is a classic script; esbuild emits ESM
// with no imports/exports for it, which is valid as a classic script too.
const html = (await readFile(path.join(root, 'src/client/index.html'), 'utf8'))
  .replace('%CSS%', css)
  .replace('%THEME%', theme)
  .replace('%APP%', app);
await writeFile(path.join(out, 'index.html'), html);

let total = 0;
for (const [file, o] of outputs) {
  total += o.bytes;
  console.log(`${path.relative(root, file).padEnd(48)} ${(o.bytes / 1024).toFixed(1)} kB`);
}
console.log(`total ${(total / 1024).toFixed(1)} kB (before compression)`);
