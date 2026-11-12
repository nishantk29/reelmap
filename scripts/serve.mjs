// Local server: runs the real Worker code in Node against dist/public.
//   node scripts/serve.mjs              preview mode (no token)
//   MOCK_TMDB=1 node scripts/serve.mjs  live mode against a mocked TMDB built from fixtures
//   TMDB_READ_ACCESS_TOKEN=... node scripts/serve.mjs   live mode against real TMDB
import { build } from 'esbuild';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { Readable } from 'node:stream';

const root = path.resolve(import.meta.dirname, '..');
const port = Number(process.env.PORT ?? 8787);
const outdir = path.join(root, 'dist/node');

await build({
  absWorkingDir: root,
  entryPoints: { worker: 'src/worker/app.ts', fixtures: 'src/fixtures/index.ts' },
  bundle: true,
  format: 'esm',
  platform: 'neutral',
  outdir,
  outExtension: { '.js': '.mjs' },
  logLevel: 'warning',
});
const { handle } = await import(path.join(outdir, 'worker.mjs'));

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
  '.png': 'image/png',
};

const publicDir = path.join(root, 'dist/public');
const ASSETS = {
  async fetch(req) {
    let p = decodeURIComponent(new URL(req.url).pathname);
    if (p.endsWith('/')) p += 'index.html';
    const file = path.join(publicDir, p);
    if (!file.startsWith(publicDir)) return new Response('Not found', { status: 404 });
    try {
      const body = await readFile(file);
      return new Response(req.method === 'HEAD' ? null : body, {
        headers: { 'Content-Type': TYPES[path.extname(file)] ?? 'application/octet-stream' },
      });
    } catch {
      return new Response('Not found', { status: 404 });
    }
  },
};

const env = { ASSETS };
const MOCK_TOKEN = 'mock-token';
if (process.env.MOCK_TMDB) {
  const fx = await import(path.join(outdir, 'fixtures.mjs'));
  env.TMDB_READ_ACCESS_TOKEN = MOCK_TOKEN;
  const realFetch = globalThis.fetch;
  globalThis.fetch = async (input, init) => {
    const url = new URL(typeof input === 'string' ? input : input.url);
    if (url.hostname !== 'api.themoviedb.org') return realFetch(input, init);
    const auth = new Headers(init?.headers).get('Authorization');
    if (auth !== `Bearer ${MOCK_TOKEN}`) return Response.json({ status_message: 'bad auth' }, { status: 401 });
    const p = url.pathname.replace(/^\/3/, '');
    if (p === '/search/multi') return Response.json(fx.fixtureSearch(url.searchParams.get('query') ?? ''));
    if (p === '/watch/providers/regions') return Response.json(fx.fixtureRegions());
    if (p.startsWith('/watch/providers/')) return Response.json(fx.fixtureProviders());
    const m = /^\/(movie|tv)\/(\d+)$/.exec(p);
    const t = m && fx.fixtureTitle(m[1], Number(m[2]));
    return t ? Response.json(t) : Response.json({ status_message: 'not found' }, { status: 404 });
  };
} else if (process.env.TMDB_READ_ACCESS_TOKEN) {
  env.TMDB_READ_ACCESS_TOKEN = process.env.TMDB_READ_ACCESS_TOKEN;
}

createServer(async (req, res) => {
  try {
    const url = `http://localhost:${port}${req.url}`;
    const hasBody = req.method !== 'GET' && req.method !== 'HEAD';
    const request = new Request(url, {
      method: req.method,
      headers: Object.entries(req.headers).flatMap(([k, v]) => (Array.isArray(v) ? v.map((x) => [k, x]) : v ? [[k, v]] : [])),
      body: hasBody ? Readable.toWeb(req) : undefined,
      duplex: hasBody ? 'half' : undefined,
    });
    const response = await handle(request, env, { waitUntil() {} });
    const headers = {};
    response.headers.forEach((v, k) => (headers[k] = v));
    // Local server is plain http; HSTS and upgrade-insecure-requests would break it.
    delete headers['strict-transport-security'];
    if (headers['content-security-policy']) headers['content-security-policy'] = headers['content-security-policy'].replace(/;\s*upgrade-insecure-requests/, '');
    res.writeHead(response.status, headers);
    if (response.body) for await (const chunk of response.body) res.write(chunk);
    res.end();
  } catch (err) {
    console.error(err);
    res.writeHead(500).end('error');
  }
}).listen(port, () => {
  const mode = env.TMDB_READ_ACCESS_TOKEN ? (process.env.MOCK_TMDB ? 'live (mocked TMDB)' : 'live') : 'preview';
  console.log(`Reelmap on http://localhost:${port} in ${mode} mode`);
});
