import { describe, expect, it } from 'vitest';
import { buildGroups, countryMatcher, emptyFilters, groupAvailability, regionSummary } from '../src/shared/availability';
import type { Provider, RegionOffers } from '../src/shared/types';

const names: Record<string, string> = { DE: 'Germany', FR: 'France', GB: 'United Kingdom', US: 'United States', JP: 'Japan' };
const countryName = (cc: string) => names[cc] ?? cc;

const providers: Record<string, Provider> = {
  8: { id: 8, name: 'Netflix', logo: null },
  9: { id: 9, name: 'Prime Video', logo: null },
  2: { id: 2, name: 'Apple TV Store', logo: null },
  300: { id: 300, name: 'Pluto TV', logo: null },
  38: { id: 38, name: 'BBC iPlayer', logo: null },
};

const regions: RegionOffers[] = [
  { cc: 'DE', link: 'l-de', offers: { stream: [8], rent: [2], buy: [2] } },
  { cc: 'FR', link: 'l-fr', offers: { stream: [8, 9], ads: [300] } },
  { cc: 'GB', link: 'l-gb', offers: { free: [38], rent: [2], stream: [9] } },
  { cc: 'US', link: 'l-us', offers: { stream: [8], ads: [300], buy: [2] } },
  { cc: 'JP', link: null, offers: { stream: [8] } },
];
const detail = { regions, providers };

describe('buildGroups', () => {
  it('collects countries per service and type', () => {
    const groups = buildGroups(regions, providers, new Set());
    const netflix = groups.find((g) => g.provider.id === 8)!;
    expect(netflix.byType.stream).toEqual(['DE', 'FR', 'US', 'JP']);
    expect(netflix.countries).toHaveLength(4);
    const apple = groups.find((g) => g.provider.id === 2)!;
    expect(apple.byType.rent).toEqual(['DE', 'GB']);
    expect(apple.byType.buy).toEqual(['DE', 'US']);
    expect(apple.countries.sort()).toEqual(['DE', 'GB', 'US']);
  });
});

describe('groupAvailability', () => {
  it('sorts by country count, then name, and counts types', () => {
    const r = groupAvailability(detail, emptyFilters(countryName));
    expect(r.groups.map((g) => g.provider.name)).toEqual(['Netflix', 'Apple TV Store', 'Pluto TV', 'Prime Video', 'BBC iPlayer']);
    expect(r.counts).toEqual({ stream: 2, free: 1, ads: 1, rent: 1, buy: 1 });
    expect(r.countryCount).toBe(5);
  });

  it('sorts country chips by name', () => {
    const r = groupAvailability(detail, emptyFilters(countryName));
    expect(r.groups[0]!.byType.stream).toEqual(['FR', 'DE', 'JP', 'US']);
  });

  it('puts My services first', () => {
    const f = { ...emptyFilters(countryName), mine: new Set([38]) };
    const r = groupAvailability(detail, f);
    expect(r.groups[0]!.provider.name).toBe('BBC iPlayer');
    expect(r.groups[0]!.mine).toBe(true);
  });

  it('filters to My services only', () => {
    const f = { ...emptyFilters(countryName), mine: new Set([9, 300]), onlyMine: true };
    expect(groupAvailability(detail, f).groups.map((g) => g.provider.id)).toEqual([300, 9]);
  });

  it('filters by offer types (multi-select) and keeps facet counts', () => {
    const f = { ...emptyFilters(countryName), types: new Set(['rent', 'free'] as const) };
    const r = groupAvailability(detail, f);
    expect(r.groups.map((g) => g.provider.name)).toEqual(['Apple TV Store', 'BBC iPlayer']);
    expect(r.groups[0]!.byType).toEqual({ rent: ['DE', 'GB'] });
    expect(r.counts.stream).toBe(2);
  });

  it('stream only hides rent, buy, free and ads', () => {
    const f = { ...emptyFilters(countryName), types: new Set(['stream'] as const) };
    const r = groupAvailability(detail, f);
    for (const g of r.groups) expect(Object.keys(g.byType)).toEqual(['stream']);
  });

  it('filters by country code or name', () => {
    const byCode = groupAvailability(detail, { ...emptyFilters(countryName), countryQuery: 'gb' });
    expect(byCode.groups.map((g) => g.provider.name)).toEqual(['Apple TV Store', 'BBC iPlayer', 'Prime Video']);
    expect(byCode.countryCount).toBe(1);
    const byName = groupAvailability(detail, { ...emptyFilters(countryName), countryQuery: 'king' });
    expect(byName.countryCount).toBe(1);
    const none = groupAvailability(detail, { ...emptyFilters(countryName), countryQuery: 'atlantis' });
    expect(none.groups).toEqual([]);
    expect(none.counts.stream).toBe(0);
  });
});

describe('countryMatcher', () => {
  it('one letter matches name prefix only', () => {
    const m = countryMatcher('f', countryName);
    expect(m('FR')).toBe(true);
    expect(m('DE')).toBe(false);
  });
});

describe('regionSummary', () => {
  it('lists services for one country, mine first then by type rank', () => {
    const s = regionSummary(detail, 'gb', new Set([2]));
    expect(s.link).toBe('l-gb');
    expect(s.entries.map((e) => [e.provider.name, e.types])).toEqual([
      ['Apple TV Store', ['rent']],
      ['Prime Video', ['stream']],
      ['BBC iPlayer', ['free']],
    ]);
  });
  it('respects type filters and unknown regions', () => {
    expect(regionSummary(detail, 'US', new Set(), new Set(['ads'])).entries.map((e) => e.provider.id)).toEqual([300]);
    expect(regionSummary(detail, 'ZZ', new Set())).toEqual({ link: null, entries: [] });
  });
});
