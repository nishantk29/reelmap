// Project lint rules that TypeScript cannot check.
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const rules = [
  { re: /\.innerHTML\s*=|insertAdjacentHTML|document\.write/, msg: 'no HTML string injection', in: /^src\// },
  { re: /\bstyle\s*=\s*["']|['"]style['"]\s*:/, msg: 'no inline style attributes (CSP)', in: /^src\/client\/(?!dom\.ts)/ },
  { re: /console\.(log|debug|info)\(/, msg: 'no console logging in shipped code', in: /^src\// },
  { re: /—/, msg: 'no em dashes in copy', in: /^(src|docs|README)/ },
  { re: /<script>(?!<\/script>)|\son[a-z]+="/, msg: 'no inline scripts or handlers', in: /\.html$/ },
  { re: /TMDB_READ_ACCESS_TOKEN\s*=\s*["'][^"']+/, msg: 'no hard-coded token', in: /./ },
];

async function* walk(dir) {
  for (const e of await readdir(dir, { withFileTypes: true })) {
    if (['node_modules', 'dist', '.git', '.wrangler', 'test-results', 'playwright-report'].includes(e.name) || e.name.startsWith('dist-')) continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) yield* walk(p);
    else if (/\.(ts|mjs|js|html|css|md|toml)$/.test(e.name)) yield p;
  }
}

let problems = 0;
for await (const file of walk(root)) {
  const rel = path.relative(root, file).split(path.sep).join('/');
  if (rel === 'scripts/lint.mjs') continue;
  const lines = (await readFile(file, 'utf8')).split('\n');
  lines.forEach((line, i) => {
    for (const r of rules) {
      if (r.in.test(rel) && r.re.test(line)) {
        problems++;
        console.error(`${rel}:${i + 1}  ${r.msg}`);
      }
    }
  });
}
if (problems) {
  console.error(`\n${problems} problem(s)`);
  process.exit(1);
}
console.log('lint: clean');
