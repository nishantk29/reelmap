/**
 * Turns raw TMDB v3 JSON into the compact shapes the client uses.
 * The Worker runs this on live data and the preview mode runs it on fixtures,
 * so both paths share one code path.
 */
import type { MediaType, OfferType, Provider, Region, RegionOffers, SearchItem, TitleDetail } from './types';

type Json = Record<string, unknown>;

const str = (v: unknown): string => (typeof v === 'string' ? v : '');
const num = (v: unknown): number | null => (typeof v === 'number' && Number.isFinite(v) ? v : null);
const arr = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);
const obj = (v: unknown): Json => (v && typeof v === 'object' && !Array.isArray(v) ? (v as Json) : {});
const path = (v: unknown): string | null => {
  const s = str(v);
  return s.startsWith('/') && s.length < 200 ? s : null;
};
const yearOf = (date: unknown): string | null => {
  const m = /^(\d{4})/.exec(str(date));
  return m ? m[1]! : null;
};

export function normalizeSearch(raw: unknown): SearchItem[] {
  const out: SearchItem[] = [];
  for (const r of arr(obj(raw).results)) {
    const o = obj(r);
    const type = o.media_type;
    if (type !== 'movie' && type !== 'tv') continue; // drops people and anything else
    const id = num(o.id);
    if (!id) continue;
    out.push({
      id,
      type,
      title: str(type === 'movie' ? o.title : o.name) || str(o.original_title ?? o.original_name) || 'Untitled',
      year: yearOf(type === 'movie' ? o.release_date : o.first_air_date),
      poster: path(o.poster_path),
      overview: str(o.overview),
    });
  }
  return out;
}

/** TMDB key in watch/providers payloads mapped to our offer types. */
const OFFER_KEYS: Record<string, OfferType> = {
  flatrate: 'stream',
  free: 'free',
  ads: 'ads',
  rent: 'rent',
  buy: 'buy',
};

export function normalizeProviderRef(raw: unknown): Provider | null {
  const o = obj(raw);
  const id = num(o.provider_id);
  const name = str(o.provider_name).trim();
  if (!id || !name) return null;
  const p: Provider = { id, name, logo: path(o.logo_path) };
  const prio = num(o.display_priority);
  if (prio !== null) p.priority = prio;
  return p;
}

export function normalizeWatchProviders(raw: unknown): { providers: Record<string, Provider>; regions: RegionOffers[] } {
  const providers: Record<string, Provider> = {};
  const regions: RegionOffers[] = [];
  const results = obj(obj(raw).results);
  for (const cc of Object.keys(results).sort()) {
    if (!/^[A-Z]{2}$/.test(cc)) continue;
    const r = obj(results[cc]);
    const offers: RegionOffers['offers'] = {};
    for (const [key, type] of Object.entries(OFFER_KEYS)) {
      const ids: number[] = [];
      for (const pr of arr(r[key])) {
        const p = normalizeProviderRef(pr);
        if (!p) continue;
        if (!providers[p.id]) providers[p.id] = { id: p.id, name: p.name, logo: p.logo };
        if (!ids.includes(p.id)) ids.push(p.id);
      }
      if (ids.length) offers[type] = ids;
    }
    if (Object.keys(offers).length === 0) continue;
    const link = str(r.link);
    regions.push({ cc, link: /^https:\/\/www\.themoviedb\.org\//.test(link) ? link : null, offers });
  }
  return { providers, regions };
}

export function normalizeTitle(raw: unknown, type: MediaType): TitleDetail {
  const o = obj(raw);
  const isMovie = type === 'movie';
  const runtimes = arr(o.episode_run_time).map(num).filter((n): n is number => n !== null);
  const { providers, regions } = normalizeWatchProviders(o['watch/providers']);
  return {
    id: num(o.id) ?? 0,
    type,
    title: str(isMovie ? o.title : o.name) || 'Untitled',
    year: yearOf(isMovie ? o.release_date : o.first_air_date),
    runtime: isMovie ? num(o.runtime) || null : runtimes[0] ?? null,
    seasons: isMovie ? null : num(o.number_of_seasons),
    episodes: isMovie ? null : num(o.number_of_episodes),
    genres: arr(o.genres).map((g) => str(obj(g).name)).filter(Boolean),
    overview: str(o.overview),
    tagline: str(o.tagline),
    poster: path(o.poster_path),
    backdrop: path(o.backdrop_path),
    providers,
    regions,
  };
}

export function normalizeRegions(raw: unknown): Region[] {
  return arr(obj(raw).results)
    .map((r) => {
      const o = obj(r);
      return { cc: str(o.iso_3166_1).toUpperCase(), name: str(o.english_name) || str(o.native_name) };
    })
    .filter((r) => /^[A-Z]{2}$/.test(r.cc) && r.name)
    .sort((a, b) => a.name.localeCompare(b.name));
}

/** Merges one or more provider-list payloads, deduped by id, ordered by priority then name. */
export function normalizeProviderList(...raws: unknown[]): Provider[] {
  const byId = new Map<number, Provider>();
  for (const raw of raws) {
    for (const r of arr(obj(raw).results)) {
      const p = normalizeProviderRef(r);
      if (!p) continue;
      const prev = byId.get(p.id);
      if (!prev || (p.priority ?? 999) < (prev.priority ?? 999)) byId.set(p.id, p);
    }
  }
  return [...byId.values()].sort((a, b) => (a.priority ?? 999) - (b.priority ?? 999) || a.name.localeCompare(b.name));
}
