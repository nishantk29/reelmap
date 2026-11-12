export type Route =
  | { name: 'home' }
  | { name: 'search'; q: string }
  | { name: 'title'; type: 'movie' | 'tv'; id: number }
  | { name: 'about' }
  | { name: 'notfound' };

export function parse(loc: { pathname: string; search: string }): Route {
  const p = loc.pathname.replace(/\/+$/, '') || '/';
  if (p === '/' || p === '/index.html') return { name: 'home' };
  if (p === '/about') return { name: 'about' };
  if (p === '/search') {
    const q = (new URLSearchParams(loc.search).get('q') ?? '').trim().slice(0, 100);
    return q ? { name: 'search', q } : { name: 'home' };
  }
  const m = /^\/title\/(movie|tv)\/([1-9]\d{0,9})$/.exec(p);
  if (m) return { name: 'title', type: m[1] as 'movie' | 'tv', id: Number(m[2]) };
  return { name: 'notfound' };
}

type Listener = () => void;
let listener: Listener = () => {};

export function start(fn: Listener): void {
  listener = fn;
  window.addEventListener('popstate', () => listener());
  document.addEventListener('click', (e) => {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    const a = (e.target as Element).closest?.('a[href]') as HTMLAnchorElement | null;
    if (!a || a.target || a.hasAttribute('download')) return;
    const url = new URL(a.href, location.href);
    if (url.origin !== location.origin || url.pathname.startsWith('/api/') || /\.\w+$/.test(url.pathname)) return;
    if (url.pathname === location.pathname && url.search === location.search && url.hash) return;
    e.preventDefault();
    navigate(url.pathname + url.search + url.hash);
  });
  listener();
}

export function navigate(path: string, replace = false): void {
  if (replace) history.replaceState(null, '', path);
  else history.pushState(null, '', path);
  listener();
}

/** Updates one query param without a re-render. */
export function setParam(key: string, value: string | null): void {
  const url = new URL(location.href);
  if (value) url.searchParams.set(key, value);
  else url.searchParams.delete(key);
  history.replaceState(null, '', url.pathname + url.search + url.hash);
}
