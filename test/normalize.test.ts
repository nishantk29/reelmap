import { describe, expect, it } from 'vitest';
import { normalizeProviderList, normalizeRegions, normalizeSearch, normalizeTitle } from '../src/shared/normalize';
import { fixtureProviders, fixtureRegions, fixtureSearch, fixtureTitle } from '../src/fixtures';

describe('normalizeSearch', () => {
  it('keeps movies and tv, drops people', () => {
    const raw = {
      results: [
        { id: 1, media_type: 'movie', title: 'A', release_date: '2001-02-03', poster_path: '/a.jpg', overview: 'o' },
        { id: 2, media_type: 'person', name: 'P' },
        { id: 3, media_type: 'tv', name: 'B', first_air_date: '', poster_path: null },
      ],
    };
    expect(normalizeSearch(raw)).toEqual([
      { id: 1, type: 'movie', title: 'A', year: '2001', poster: '/a.jpg', overview: 'o' },
      { id: 3, type: 'tv', title: 'B', year: null, poster: null, overview: '' },
    ]);
  });
  it('drops the fictional person in fixtures', () => {
    const items = normalizeSearch(fixtureSearch('lantern'));
    expect(items.map((i) => i.title)).toEqual(['The Lantern Keepers']);
  });
  it('rejects non-path poster values', () => {
    const [item] = normalizeSearch({ results: [{ id: 1, media_type: 'movie', title: 'x', poster_path: 'https://evil/x.jpg' }] });
    expect(item!.poster).toBeNull();
  });
});

describe('normalizeTitle', () => {
  it('maps TMDB offer keys to our types and collects providers', () => {
    const t = normalizeTitle(
      {
        id: 7,
        title: 'T',
        release_date: '1999-01-01',
        runtime: 90,
        genres: [{ id: 1, name: 'Drama' }],
        'watch/providers': {
          results: {
            DE: { link: 'https://www.themoviedb.org/movie/7/watch?locale=DE', flatrate: [{ provider_id: 8, provider_name: 'Netflix', logo_path: '/n.png' }], rent: [{ provider_id: 2, provider_name: 'Apple TV Store' }] },
            xx: { flatrate: [{ provider_id: 8, provider_name: 'Netflix' }] },
            FR: { link: 'javascript:alert(1)', ads: [{ provider_id: 300, provider_name: 'Pluto TV' }] },
          },
        },
      },
      'movie',
    );
    expect(t.year).toBe('1999');
    expect(t.runtime).toBe(90);
    expect(t.genres).toEqual(['Drama']);
    expect(t.regions).toEqual([
      { cc: 'DE', link: 'https://www.themoviedb.org/movie/7/watch?locale=DE', offers: { stream: [8], rent: [2] } },
      { cc: 'FR', link: null, offers: { ads: [300] } },
    ]);
    expect(Object.keys(t.providers).sort()).toEqual(['2', '300', '8']);
  });
  it('reads tv seasons and episode runtime', () => {
    const t = normalizeTitle(fixtureTitle('tv', 900102), 'tv');
    expect(t.title).toBe('Saltwater Hymn');
    expect(t.seasons).toBe(3);
    expect(t.runtime).toBe(52);
    expect(t.regions.length).toBeGreaterThan(10);
  });
});

describe('lists', () => {
  it('normalizes regions sorted by name', () => {
    const r = normalizeRegions(fixtureRegions());
    expect(r[0]).toEqual({ cc: 'AR', name: 'Argentina' });
    expect(r.every((x) => /^[A-Z]{2}$/.test(x.cc))).toBe(true);
  });
  it('merges provider lists by id with the best priority', () => {
    const merged = normalizeProviderList(
      { results: [{ provider_id: 8, provider_name: 'Netflix', display_priority: 5 }] },
      { results: [{ provider_id: 8, provider_name: 'Netflix', display_priority: 1 }, { provider_id: 9, provider_name: 'Prime', display_priority: 2 }] },
    );
    expect(merged.map((p) => [p.id, p.priority])).toEqual([[8, 1], [9, 2]]);
    expect(normalizeProviderList(fixtureProviders()).length).toBeGreaterThan(10);
  });
});
