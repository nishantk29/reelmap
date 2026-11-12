import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { handle } from '../src/worker/app';
import { resetLimits, TITLE_TTL, TTL, type Env } from '../src/worker/api';
import { fixtureProviders, fixtureRegions, fixtureSearch, fixtureTitle } from '../src/fixtures';

const TOKEN = 'test-token-abc123-secret';
const ORIGIN = 'https://where.example';

/** Minimal Cache API stand-in. */
class MemoryCache {
  store = new Map<string, Response>();
  async match(req: Request) {
    const r = this.store.get(req.url);
    return r ? r.clone() : undefined;
  }
  async put(req: Request, res: Response) {
    this.store.set(req.url, res.clone());
  }
}

let cache: MemoryCache;
let upstream: ReturnType<typeof vi.fn>;
const waits: Promise<unknown>[] = [];
const ctx = { waitUntil: (p: Promise<unknown>) => void waits.push(p) };

function mockTmdb(url: string): Response {
  const u = new URL(url);
  const p = u.pathname.replace('/3', '');
  if (p === '/search/multi') return Response.json(fixtureSearch(u.searchParams.get('query') ?? ''));
  if (p === '/watch/providers/regions') return Response.json(fixtureRegions());
  if (p.startsWith('/watch/providers/')) return Response.json(fixtureProviders());
  const m = /^\/(movie|tv)\/(\d+)$/.exec(p);
  if (m) {
    const t = fixtureTitle(m[1] as 'movie' | 'tv', Number(m[2]));
    return t ? Response.json(t) : Response.json({ status_message: 'nope' }, { status: 404 });
  }
  return new Response('?', { status: 500 });
}

beforeEach(() => {
  resetLimits();
  cache = new MemoryCache();
  vi.stubGlobal('caches', { default: cache });
  upstream = vi.fn(async (input: RequestInfo | URL) => mockTmdb(String(input instanceof Request ? input.url : input)));
  vi.stubGlobal('fetch', upstream);
});
afterEach(() => {
  vi.unstubAllGlobals();
  waits.length = 0;
});

const env = (extra: Partial<Env> = {}): Env => ({ TMDB_READ_ACCESS_TOKEN: TOKEN, ...extra });
const get = (path: string, e: Env = env(), init: RequestInit = {}) => handle(new Request(ORIGIN + path, init), e, ctx);
const settle = () => Promise.all(waits);

describe('proxy', () => {
  it('adds the bearer token upstream and never echoes it', async () => {
    const res = await get('/api/search?q=lantern');
    expect(res.status).toBe(200);
    const [url, init] = upstream.mock.calls[0]!;
    expect(String(url)).toMatch(/^https:\/\/api\.themoviedb\.org\/3\/search\/multi\?/);
    expect((init as RequestInit).headers).toMatchObject({ Authorization: `Bearer ${TOKEN}` });
    const text = await res.text();
    expect(text).not.toContain(TOKEN);
    for (const [, v] of res.headers) expect(v).not.toContain(TOKEN);
    const body = JSON.parse(text);
    expect(body[0]).toMatchObject({ type: 'movie', title: 'The Lantern Keepers' });
    expect(body.some((i: { title: string }) => i.title === 'Marguerite Lanternfield')).toBe(false);
  });

  it('serves title details with watch providers appended', async () => {
    const res = await get('/api/title/movie/900101');
    expect(res.status).toBe(200);
    expect(String(upstream.mock.calls[0]![0])).toContain('append_to_response=watch%2Fproviders');
    const body = (await res.json()) as { title: string; regions: unknown[] };
    expect(body.title).toBe('The Lantern Keepers');
    expect(body.regions.length).toBeGreaterThan(5);
  });

  it('maps upstream 404 to 404 and other failures to 502 without leaking', async () => {
    expect((await get('/api/title/tv/900101')).status).toBe(404);
    upstream.mockImplementationOnce(async () => new Response('{"status_message":"Invalid API key"}', { status: 401 }));
    const res = await get('/api/regions');
    expect(res.status).toBe(502);
    expect(await res.json()).toEqual({ error: 'upstream_error' });
  });
});

describe('caching', () => {
  it.each([
    ['/api/search?q=tide', TTL.search],
    ['/api/title/tv/900102', TITLE_TTL],
    ['/api/regions', TTL.lists],
    ['/api/providers', TTL.lists],
  ])('%s gets max-age %i and is cached', async (path, ttl) => {
    const first = await get(path);
    expect(first.headers.get('Cache-Control')).toBe(`public, max-age=${ttl}`);
    expect(first.headers.get('X-Reelmap-Cache')).toBe('MISS');
    await settle();
    const calls = upstream.mock.calls.length;
    const second = await get(path);
    expect(second.headers.get('X-Reelmap-Cache')).toBe('HIT');
    expect(upstream.mock.calls.length).toBe(calls);
    expect(await second.json()).toEqual(await first.json());
  });

  it('uses the right TTL values', () => {
    expect(TTL).toEqual({ search: 600, details: 86400, providers: 43200, lists: 604800 });
    expect(TITLE_TTL).toBe(43200);
  });

  it('does not put the token into cache keys', async () => {
    await get('/api/search?q=hymn');
    await settle();
    for (const k of cache.store.keys()) expect(k).not.toContain(TOKEN);
  });

  it('uses KV when bound', async () => {
    vi.stubGlobal('caches', undefined);
    const kv = new Map<string, string>();
    const CACHE = {
      get: vi.fn(async (k: string) => kv.get(k) ?? null),
      put: vi.fn(async (k: string, v: string, o: { expirationTtl: number }) => {
        expect(o.expirationTtl).toBe(TTL.lists);
        kv.set(k, v);
      }),
    } as unknown as KVNamespace;
    await get('/api/regions', env({ CACHE }));
    await settle();
    const res = await get('/api/regions', env({ CACHE }));
    expect(res.headers.get('X-Reelmap-Cache')).toBe('KV');
    expect(upstream).toHaveBeenCalledTimes(1);
  });

  it('merges movie and tv provider lists, or one type', async () => {
    await get('/api/providers');
    expect(upstream).toHaveBeenCalledTimes(2);
    upstream.mockClear();
    await get('/api/providers?type=tv');
    expect(String(upstream.mock.calls[0]![0])).toContain('/watch/providers/tv');
  });
});

describe('validation', () => {
  it.each([
    '/api/search',
    '/api/search?q=',
    `/api/search?q=${'x'.repeat(101)}`,
    '/api/search?q=ok&page=99',
    '/api/title/person/1',
    '/api/title/movie/0',
    '/api/title/movie/-4',
    '/api/title/movie/abc',
    '/api/providers?type=music',
  ])('%s returns 400 JSON', async (path) => {
    const res = await get(path);
    expect(res.status).toBe(400);
    expect(res.headers.get('Content-Type')).toContain('application/json');
    expect(((await res.json()) as { error: string }).error).toMatch(/^(invalid|missing|empty|query)_/);
    expect(upstream).not.toHaveBeenCalled();
  });

  it('rejects other methods with 405', async () => {
    for (const method of ['POST', 'PUT', 'DELETE', 'PATCH']) {
      const res = await get('/api/search?q=x', env(), { method });
      expect(res.status).toBe(405);
      expect(res.headers.get('Allow')).toBe('GET, HEAD, OPTIONS');
    }
  });

  it('unknown api path is 404', async () => {
    expect((await get('/api/nope')).status).toBe(404);
  });
});

describe('not configured', () => {
  it('returns 503 not_configured for data routes and reports it in meta', async () => {
    const e = env({ TMDB_READ_ACCESS_TOKEN: undefined });
    const res = await get('/api/search?q=lantern', e);
    expect(res.status).toBe(503);
    expect(((await res.json()) as { error: string }).error).toBe('not_configured');
    const meta = await (await get('/api/meta', e)).json();
    expect(meta).toEqual({ configured: false, country: null });
    expect(upstream).not.toHaveBeenCalled();
  });
  it('still validates input first', async () => {
    expect((await get('/api/title/movie/x', env({ TMDB_READ_ACCESS_TOKEN: '' }))).status).toBe(400);
  });
});

describe('headers and CORS', () => {
  const fakeAssets = {
    fetch: vi.fn(async (req: Request) => {
      const p = new URL(req.url).pathname;
      if (p === '/index.html') return new Response('<!doctype html><title>shell</title>', { headers: { 'Content-Type': 'text/html' } });
      if (p === '/assets/app-ABCDEFGH.js') return new Response('1', { headers: { 'Content-Type': 'text/javascript' } });
      return new Response('nf', { status: 404 });
    }),
  } as unknown as Fetcher;

  it('sets security headers on API, static and error responses', async () => {
    for (const res of [
      await get('/api/search?q=a'),
      await get('/api/title/x/1'),
      await get('/', env({ ASSETS: fakeAssets })),
      await get('/nope.txt', env({ ASSETS: fakeAssets })),
    ]) {
      const csp = res.headers.get('Content-Security-Policy')!;
      expect(csp).toContain("script-src 'self'");
      expect(csp).toContain("frame-ancestors 'none'");
      expect(csp).toContain('img-src');
      expect(csp).toContain('https://image.tmdb.org');
      expect(csp).not.toContain('unsafe-inline');
      expect(res.headers.get('X-Content-Type-Options')).toBe('nosniff');
      expect(res.headers.get('Referrer-Policy')).toBe('strict-origin-when-cross-origin');
      expect(res.headers.get('Permissions-Policy')).toContain('camera=()');
      expect(res.headers.get('Strict-Transport-Security')).toContain('max-age=');
    }
  });

  it('serves the SPA shell for title routes with no-cache, and hashed assets immutable', async () => {
    const shell = await get('/title/movie/900101', env({ ASSETS: fakeAssets }));
    expect(shell.status).toBe(200);
    expect(await shell.text()).toContain('shell');
    expect(shell.headers.get('Cache-Control')).toBe('no-cache');
    const js = await get('/assets/app-ABCDEFGH.js', env({ ASSETS: fakeAssets }));
    expect(js.headers.get('Cache-Control')).toContain('immutable');
    expect((await get('/missing', env({ ASSETS: fakeAssets }))).status).toBe(404);
  });

  it('answers OPTIONS without wildcard CORS', async () => {
    const same = await get('/api/search?q=a', env(), { method: 'OPTIONS', headers: { Origin: ORIGIN } });
    expect(same.status).toBe(204);
    expect(same.headers.get('Access-Control-Allow-Origin')).toBe(ORIGIN);
    expect(same.headers.get('Access-Control-Allow-Credentials')).toBeNull();
    const other = await get('/api/search?q=a', env(), { method: 'OPTIONS', headers: { Origin: 'https://evil.example' } });
    expect(other.status).toBe(204);
    expect(other.headers.get('Access-Control-Allow-Origin')).toBeNull();
  });

  it('HEAD returns headers without a body', async () => {
    const res = await get('/api/regions', env(), { method: 'HEAD' });
    expect(res.status).toBe(200);
    expect(await res.text()).toBe('');
  });

  it('soft-limits a single IP', async () => {
    let last: Response | null = null;
    for (let i = 0; i < 125; i++) last = await get('/api/meta', env(), { headers: { 'CF-Connecting-IP': '203.0.113.9' } });
    expect(last!.status).toBe(429);
  });
});
