/**
 * Data access. Live mode calls the Worker. When the Worker says it has no
 * TMDB token (503 not_configured), the app switches to preview mode and
 * serves bundled fictional fixtures instead.
 */
import type { Meta, Provider, Region, SearchItem, TitleDetail, MediaType } from '../shared/types';

export interface DataSource {
  search(q: string, signal?: AbortSignal): Promise<SearchItem[]>;
  title(type: MediaType, id: number, signal?: AbortSignal): Promise<TitleDetail>;
  regions(): Promise<Region[]>;
  providers(): Promise<Provider[]>;
  featured?(): Promise<SearchItem[]>;
}

export class ApiError extends Error {
  constructor(public status: number, public code: string) {
    super(code);
  }
}

class NotConfigured extends Error {}

type Mode = 'live' | 'preview';
let mode: Mode = 'live';
let preview: Promise<DataSource> | null = null;
let country: string | null = null;
const modeListeners = new Set<(m: Mode) => void>();

export const getMode = () => mode;
export const visitorCountry = () => country;
export function onModeChange(fn: (m: Mode) => void): void {
  modeListeners.add(fn);
}

function usePreview(): Promise<DataSource> {
  if (!preview) {
    preview = import('./preview').then((m) => m.previewSource);
    if (mode !== 'preview') {
      mode = 'preview';
      modeListeners.forEach((fn) => fn(mode));
    }
  }
  return preview;
}

async function getJson<T>(path: string, signal?: AbortSignal): Promise<T> {
  const res = await fetch(path, { signal, headers: { Accept: 'application/json' } });
  if (res.ok) return (await res.json()) as T;
  let code = 'http_' + res.status;
  try {
    code = ((await res.json()) as { error?: string }).error ?? code;
  } catch {
    /* non-JSON error */
  }
  if (res.status === 503 && code === 'not_configured') throw new NotConfigured();
  throw new ApiError(res.status, code);
}

async function liveOrPreview<T>(live: () => Promise<T>, fallback: (p: DataSource) => Promise<T>): Promise<T> {
  if (mode === 'preview') return fallback(await usePreview());
  try {
    return await live();
  } catch (err) {
    if (err instanceof NotConfigured) return fallback(await usePreview());
    throw err;
  }
}

const memo = new Map<string, Promise<unknown>>();
function once<T>(key: string, load: () => Promise<T>): Promise<T> {
  let p = memo.get(key) as Promise<T> | undefined;
  if (!p) {
    p = load();
    memo.set(key, p);
    p.catch(() => memo.delete(key));
  }
  return p;
}

export const api: DataSource = {
  search: (q, signal) =>
    liveOrPreview(
      () => getJson<SearchItem[]>(`/api/search?q=${encodeURIComponent(q)}`, signal),
      (p) => p.search(q, signal),
    ),
  title: (type, id, signal) =>
    liveOrPreview(
      () => getJson<TitleDetail>(`/api/title/${type}/${id}`, signal),
      (p) => p.title(type, id, signal),
    ),
  regions: () => once('regions', () => liveOrPreview(() => getJson<Region[]>('/api/regions'), (p) => p.regions())),
  providers: () => once('providers', () => liveOrPreview(() => getJson<Provider[]>('/api/providers'), (p) => p.providers())),
  featured: () => (mode === 'preview' ? usePreview().then((p) => p.featured?.() ?? []) : Promise.resolve([])),
};

/** Asks the Worker whether live data is connected. */
export async function init(): Promise<Mode> {
  try {
    const meta = await getJson<Meta>('/api/meta');
    country = meta.country;
    if (!meta.configured) await usePreview();
  } catch {
    // Meta failed; stay live and let individual requests report errors.
  }
  return mode;
}
