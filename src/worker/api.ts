/**
 * /api/* : a narrow, validated proxy in front of TMDB v3.
 * The TMDB token only ever lives in env and in the upstream request header.
 */
import { normalizeProviderList, normalizeRegions, normalizeSearch, normalizeTitle } from '../shared/normalize';
import { validateId, validatePage, validateQuery, validateType } from '../shared/validate';
import type { MediaType } from '../shared/types';

export interface Env {
  TMDB_READ_ACCESS_TOKEN?: string;
  CACHE?: KVNamespace;
  ASSETS?: Fetcher;
}

export const TMDB_BASE = 'https://api.themoviedb.org/3';

/** Seconds. */
export const TTL = {
  search: 10 * 60,
  details: 24 * 60 * 60,
  providers: 12 * 60 * 60,
  lists: 7 * 24 * 60 * 60,
} as const;

/** Title responses carry watch providers too, so they use the shorter providers TTL. */
export const TITLE_TTL = Math.min(TTL.details, TTL.providers);

const CACHE_ORIGIN = 'https://cache.reelmap.internal/v1';

export function json(body: unknown, status = 200, cacheControl = 'no-store', extra: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': cacheControl, ...extra },
  });
}

const badRequest = (error: string) => json({ error }, 400);

class UpstreamError extends Error {
  constructor(public status: number) {
    super(`upstream ${status}`);
  }
}

interface Ctx {
  waitUntil(p: Promise<unknown>): void;
}

/* ---------------- soft per-IP limit (per isolate, best effort) ---------------- */

const LIMIT = 120;
const WINDOW_MS = 60_000;
const hits = new Map<string, { n: number; reset: number }>();

export function overLimit(ip: string, now = Date.now()): boolean {
  if (hits.size > 5000) hits.clear();
  const h = hits.get(ip);
  if (!h || h.reset <= now) {
    hits.set(ip, { n: 1, reset: now + WINDOW_MS });
    return false;
  }
  h.n++;
  return h.n > LIMIT;
}

export function resetLimits(): void {
  hits.clear();
}

/* ---------------- upstream + cache ---------------- */

async function tmdb(env: Env, path: string, params: Record<string, string>): Promise<unknown> {
  const url = new URL(TMDB_BASE + path);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${env.TMDB_READ_ACCESS_TOKEN}`, Accept: 'application/json' },
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) throw new UpstreamError(res.status);
  return res.json();
}

function cacheApi(): Cache | null {
  const c = (globalThis as { caches?: CacheStorage & { default?: Cache } }).caches;
  return c && c.default ? c.default : null;
}

/**
 * Looks in the Cache API, then KV, then calls `load`. Stores the normalized
 * body (never the upstream request or its headers).
 */
async function cached(env: Env, ctx: Ctx, key: string, ttl: number, load: () => Promise<unknown>): Promise<Response> {
  const cacheKey = new Request(CACHE_ORIGIN + key);
  const cc = `public, max-age=${ttl}`;
  const cache = cacheApi();

  if (cache) {
    const hit = await cache.match(cacheKey);
    if (hit) {
      const res = new Response(hit.body, hit);
      res.headers.set('X-Reelmap-Cache', 'HIT');
      return res;
    }
  }
  if (env.CACHE) {
    const body = await env.CACHE.get(key);
    if (body) {
      const res = json(JSON.parse(body), 200, cc, { 'X-Reelmap-Cache': 'KV' });
      if (cache) ctx.waitUntil(cache.put(cacheKey, json(JSON.parse(body), 200, cc)));
      return res;
    }
  }

  const data = await load();
  const body = JSON.stringify(data);
  if (cache) ctx.waitUntil(cache.put(cacheKey, json(data, 200, cc)));
  if (env.CACHE) ctx.waitUntil(env.CACHE.put(key, body, { expirationTtl: Math.max(60, ttl) }));
  return json(data, 200, cc, { 'X-Reelmap-Cache': 'MISS' });
}

/* ---------------- routes ---------------- */

export async function handleApi(request: Request, env: Env, ctx: Ctx): Promise<Response> {
  const url = new URL(request.url);
  const path = url.pathname.replace(/\/+$/, '');
  const ip = request.headers.get('CF-Connecting-IP') ?? 'local';

  if (overLimit(ip)) return json({ error: 'rate_limited' }, 429, 'no-store', { 'Retry-After': '30' });

  if (path === '/api/meta') {
    const cf = (request as Request & { cf?: { country?: string } }).cf;
    const country = typeof cf?.country === 'string' && /^[A-Z]{2}$/.test(cf.country) ? cf.country : null;
    return json({ configured: Boolean(env.TMDB_READ_ACCESS_TOKEN), country }, 200, 'private, no-store');
  }

  // Validate first, so bad input is a 400 whether or not a token is set.
  let route: (() => Promise<Response>) | null = null;
  const title = /^\/api\/title\/([^/]+)\/([^/]+)$/.exec(path);

  if (path === '/api/search') {
    const q = validateQuery(url.searchParams.get('q'));
    if (!q.ok) return badRequest(q.error);
    const page = validatePage(url.searchParams.get('page'));
    if (!page.ok) return badRequest(page.error);
    const query = q.value.toLowerCase();
    route = () =>
      cached(env, ctx, `/search?p=${page.value}&q=${encodeURIComponent(query)}`, TTL.search, async () =>
        normalizeSearch(
          await tmdb(env, '/search/multi', {
            query,
            include_adult: 'false',
            language: 'en-US',
            page: String(page.value),
          }),
        ),
      );
  } else if (title) {
    const type = validateType(title[1]);
    if (!type.ok) return badRequest(type.error);
    const id = validateId(title[2]);
    if (!id.ok) return badRequest(id.error);
    const t: MediaType = type.value;
    route = () =>
      cached(env, ctx, `/title/${t}/${id.value}`, TITLE_TTL, async () =>
        normalizeTitle(
          await tmdb(env, `/${t}/${id.value}`, { language: 'en-US', append_to_response: 'watch/providers' }),
          t,
        ),
      );
  } else if (path === '/api/regions') {
    route = () =>
      cached(env, ctx, '/regions', TTL.lists, async () =>
        normalizeRegions(await tmdb(env, '/watch/providers/regions', { language: 'en-US' })),
      );
  } else if (path === '/api/providers') {
    const raw = url.searchParams.get('type');
    let types: MediaType[] = ['movie', 'tv'];
    if (raw !== null) {
      const type = validateType(raw);
      if (!type.ok) return badRequest(type.error);
      types = [type.value];
    }
    route = () =>
      cached(env, ctx, `/providers/${types.join('+')}`, TTL.lists, async () =>
        normalizeProviderList(
          ...(await Promise.all(types.map((t) => tmdb(env, `/watch/providers/${t}`, { language: 'en-US' })))),
        ),
      );
  }

  if (!route) return json({ error: 'not_found' }, 404);
  if (!env.TMDB_READ_ACCESS_TOKEN) {
    return json(
      { error: 'not_configured', message: "Live data isn't connected yet." },
      503,
      'no-store',
    );
  }

  try {
    return await route();
  } catch (err) {
    if (err instanceof UpstreamError) {
      if (err.status === 404) return json({ error: 'not_found' }, 404, 'public, max-age=300');
      if (err.status === 429) return json({ error: 'upstream_busy' }, 503, 'no-store', { 'Retry-After': '10' });
      return json({ error: 'upstream_error' }, 502);
    }
    return json({ error: 'upstream_unreachable' }, 502);
  }
}
