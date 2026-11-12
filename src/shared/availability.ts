/**
 * Availability grouping: turns per-region offers into per-service groups,
 * applies the offer-type, My services and country filters, and sorts.
 * Pure functions, no DOM, so they are unit tested directly.
 */
import { OFFER_TYPES, type OfferType, type Provider, type RegionOffers, type TitleDetail } from './types';

export interface ServiceGroup {
  provider: Provider;
  mine: boolean;
  /** Country codes per offer type, sorted by country name. */
  byType: Partial<Record<OfferType, string[]>>;
  /** Union of every country in byType. */
  countries: string[];
}

export interface Filters {
  /** Empty means every type. */
  types: ReadonlySet<OfferType>;
  onlyMine: boolean;
  mine: ReadonlySet<number>;
  /** Free text: matches a country code exactly or a country name by substring. */
  countryQuery: string;
  /** Resolves a code to a display name. Used for matching and sorting. */
  countryName: (cc: string) => string;
}

export interface GroupResult {
  groups: ServiceGroup[];
  /** Services that offer each type, after the other filters (facet counts). */
  counts: Record<OfferType, number>;
  /** Distinct countries shown after all filters. */
  countryCount: number;
}

export const emptyFilters = (countryName: (cc: string) => string = (c) => c): Filters => ({
  types: new Set(),
  onlyMine: false,
  mine: new Set(),
  countryQuery: '',
  countryName,
});

export function countryMatcher(query: string, countryName: (cc: string) => string): (cc: string) => boolean {
  const q = query.trim().toLowerCase();
  if (!q) return () => true;
  return (cc) => {
    if (cc.toLowerCase() === q) return true;
    if (q.length < 2) return countryName(cc).toLowerCase().startsWith(q);
    return countryName(cc).toLowerCase().includes(q);
  };
}

export function compareGroups(a: ServiceGroup, b: ServiceGroup): number {
  if (a.mine !== b.mine) return a.mine ? -1 : 1;
  if (a.countries.length !== b.countries.length) return b.countries.length - a.countries.length;
  return a.provider.name.localeCompare(b.provider.name);
}

/** Builds unfiltered groups. Exposed for tests and for the region view. */
export function buildGroups(
  regions: readonly RegionOffers[],
  providers: Readonly<Record<string, Provider>>,
  mine: ReadonlySet<number>,
): ServiceGroup[] {
  const map = new Map<number, ServiceGroup>();
  for (const region of regions) {
    for (const type of OFFER_TYPES) {
      for (const pid of region.offers[type] ?? []) {
        const provider = providers[pid];
        if (!provider) continue;
        let g = map.get(pid);
        if (!g) {
          g = { provider, mine: mine.has(pid), byType: {}, countries: [] };
          map.set(pid, g);
        }
        const list = (g.byType[type] ??= []);
        if (!list.includes(region.cc)) list.push(region.cc);
      }
    }
  }
  for (const g of map.values()) g.countries = unionCountries(g.byType);
  return [...map.values()];
}

function unionCountries(byType: ServiceGroup['byType']): string[] {
  const set = new Set<string>();
  for (const t of OFFER_TYPES) for (const cc of byType[t] ?? []) set.add(cc);
  return [...set];
}

export function groupAvailability(detail: Pick<TitleDetail, 'regions' | 'providers'>, f: Filters): GroupResult {
  const matches = countryMatcher(f.countryQuery, f.countryName);
  const byName = (a: string, b: string) => f.countryName(a).localeCompare(f.countryName(b));
  const base = buildGroups(detail.regions, detail.providers, f.mine)
    .filter((g) => !f.onlyMine || g.mine)
    .map((g) => {
      const byType: ServiceGroup['byType'] = {};
      for (const t of OFFER_TYPES) {
        const list = (g.byType[t] ?? []).filter(matches).sort(byName);
        if (list.length) byType[t] = list;
      }
      return { ...g, byType };
    });

  const counts = Object.fromEntries(OFFER_TYPES.map((t) => [t, 0])) as Record<OfferType, number>;
  for (const g of base) for (const t of OFFER_TYPES) if (g.byType[t]?.length) counts[t]++;

  const groups: ServiceGroup[] = [];
  for (const g of base) {
    const byType: ServiceGroup['byType'] = {};
    for (const t of OFFER_TYPES) {
      if (f.types.size && !f.types.has(t)) continue;
      if (g.byType[t]) byType[t] = g.byType[t];
    }
    const countries = unionCountries(byType).sort(byName);
    if (countries.length) groups.push({ ...g, byType, countries });
  }
  groups.sort(compareGroups);
  const all = new Set<string>();
  for (const g of groups) for (const cc of g.countries) all.add(cc);
  return { groups, counts, countryCount: all.size };
}

export interface RegionEntry {
  provider: Provider;
  mine: boolean;
  types: OfferType[];
}

/** What one region offers, for the "Where can I watch from <country>?" view. */
export function regionSummary(
  detail: Pick<TitleDetail, 'regions' | 'providers'>,
  cc: string,
  mine: ReadonlySet<number>,
  types: ReadonlySet<OfferType> = new Set(),
): { link: string | null; entries: RegionEntry[] } {
  const region = detail.regions.find((r) => r.cc === cc.toUpperCase());
  if (!region) return { link: null, entries: [] };
  const map = new Map<number, RegionEntry>();
  for (const t of OFFER_TYPES) {
    if (types.size && !types.has(t)) continue;
    for (const pid of region.offers[t] ?? []) {
      const provider = detail.providers[pid];
      if (!provider) continue;
      let e = map.get(pid);
      if (!e) map.set(pid, (e = { provider, mine: mine.has(pid), types: [] }));
      e.types.push(t);
    }
  }
  const rank = (e: RegionEntry) => Math.min(...e.types.map((t) => OFFER_TYPES.indexOf(t)));
  const entries = [...map.values()].sort(
    (a, b) => Number(b.mine) - Number(a.mine) || rank(a) - rank(b) || a.provider.name.localeCompare(b.provider.name),
  );
  return { link: region.link, entries };
}

export function linkFor(detail: Pick<TitleDetail, 'regions'>, cc: string): string | null {
  return detail.regions.find((r) => r.cc === cc)?.link ?? null;
}
