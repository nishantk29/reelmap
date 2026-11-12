import { handleApi, json, type Env } from './api';
import { withSecurity } from './headers';

interface Ctx {
  waitUntil(p: Promise<unknown>): void;
}

const ALLOWED = 'GET, HEAD, OPTIONS';

/** Paths the SPA renders itself. The Worker answers them with the HTML shell. */
export function isAppRoute(pathname: string): boolean {
  return (
    pathname === '/' ||
    pathname === '/index.html' ||
    pathname === '/about' ||
    pathname === '/search' ||
    /^\/title\/(movie|tv)\/[1-9]\d{0,9}$/.test(pathname)
  );
}

export function staticCacheControl(pathname: string): string {
  if (/^\/assets\/.+-[A-Z0-9]{8,}\.(js|css)$/i.test(pathname)) return 'public, max-age=31536000, immutable';
  if (pathname.startsWith('/fonts/')) return 'public, max-age=31536000, immutable';
  if (pathname.endsWith('.html') || pathname === '/') return 'no-cache';
  return 'public, max-age=86400';
}

async function serveStatic(request: Request, env: Env, pathname: string): Promise<Response> {
  if (!env.ASSETS) return new Response('Assets are not bound.', { status: 500 });
  const appRoute = isAppRoute(pathname);
  const assetUrl = new URL(request.url);
  if (appRoute) assetUrl.pathname = '/index.html';
  let res = await env.ASSETS.fetch(new Request(assetUrl.toString(), { method: request.method, headers: request.headers }));
  // Workers static assets may redirect /index.html to /. Follow it internally.
  if (appRoute && res.status >= 300 && res.status < 400) {
    assetUrl.pathname = '/';
    res = await env.ASSETS.fetch(new Request(assetUrl.toString(), { method: request.method }));
  }
  if (res.status === 404 && !appRoute) {
    assetUrl.pathname = '/index.html';
    const shell = await env.ASSETS.fetch(new Request(assetUrl.toString(), { method: request.method }));
    const out = new Response(shell.body, { status: 404, headers: shell.headers });
    out.headers.set('Cache-Control', 'no-cache');
    return out;
  }
  const out = new Response(res.body, res);
  if (res.ok) out.headers.set('Cache-Control', staticCacheControl(appRoute ? '/index.html' : pathname));
  return out;
}

export async function handle(request: Request, env: Env, ctx: Ctx): Promise<Response> {
  const url = new URL(request.url);
  const method = request.method.toUpperCase();
  const isApi = url.pathname === '/api' || url.pathname.startsWith('/api/');

  if (method === 'OPTIONS') {
    const headers: Record<string, string> = { Allow: ALLOWED, 'Cache-Control': 'no-store' };
    const origin = request.headers.get('Origin');
    // Same-origin only. Never "*", never credentials for other origins.
    if (origin && origin === url.origin) {
      headers['Access-Control-Allow-Origin'] = origin;
      headers['Access-Control-Allow-Methods'] = ALLOWED;
      headers['Access-Control-Allow-Headers'] = 'Content-Type';
      headers['Access-Control-Max-Age'] = '600';
      headers['Vary'] = 'Origin';
    }
    return withSecurity(new Response(null, { status: 204, headers }));
  }

  if (method !== 'GET' && method !== 'HEAD') {
    return withSecurity(json({ error: 'method_not_allowed' }, 405, 'no-store', { Allow: ALLOWED }));
  }

  let res: Response;
  try {
    res = isApi ? await handleApi(request, env, ctx) : await serveStatic(request, env, url.pathname);
  } catch {
    res = json({ error: 'internal_error' }, 500);
  }
  if (method === 'HEAD' && res.body) res = new Response(null, res);
  return withSecurity(res);
}
