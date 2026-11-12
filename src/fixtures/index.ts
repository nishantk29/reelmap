/**
 * Preview fixtures. Every title, person and plot here is invented.
 * Service names are real so the UI reads naturally, but no logos are used.
 * Data is shaped like raw TMDB v3 responses so it runs through the same
 * normalizer as live data.
 */

interface FixtureTitle {
  id: number;
  type: 'movie' | 'tv';
  title: string;
  date: string;
  runtime: number;
  seasons?: number;
  episodes?: number;
  genres: string[];
  tagline: string;
  overview: string;
  popularity: number;
  /** Stream services this title lives on, with the share of their regions. */
  homes: [number, number][];
  freeOrAds?: number[];
  rentBuy: boolean;
}

export const FIXTURE_TITLES: FixtureTitle[] = [
  {
    id: 900101, type: 'movie', title: 'The Lantern Keepers', date: '2019-10-04', runtime: 118,
    genres: ['Drama', 'Mystery'], tagline: 'Someone has to stay awake.',
    overview: 'Three siblings inherit a lighthouse on a failing island and the debts that came with it. When a ship goes missing in clear weather, the youngest starts keeping a log nobody asked for.',
    popularity: 88, homes: [[8, 0.85], [350, 0.3]], freeOrAds: [300], rentBuy: true,
  },
  {
    id: 900102, type: 'tv', title: 'Saltwater Hymn', date: '2021-03-12', runtime: 52, seasons: 3, episodes: 24,
    genres: ['Drama', 'Crime'], tagline: 'The tide keeps every secret for a while.',
    overview: 'A harbour town choir becomes the unlikely centre of a smuggling inquiry. Detective Ines Calloway joins as an alto and stays for the harmonies.',
    popularity: 92, homes: [[9, 0.8], [1899, 0.6]], freeOrAds: [73], rentBuy: true,
  },
  {
    id: 900103, type: 'movie', title: 'Northbound Static', date: '2023-06-23', runtime: 104,
    genres: ['Science Fiction', 'Thriller'], tagline: 'Listen past the noise.',
    overview: 'A night-shift radio engineer picks up a broadcast from a station that closed in 1987. Each night the signal gets clearer, and closer.',
    popularity: 75, homes: [[337, 0.7], [531, 0.5]], rentBuy: true,
  },
  {
    id: 900104, type: 'movie', title: 'A Quiet Arithmetic', date: '2016-02-11', runtime: 97,
    genres: ['Drama', 'Romance'], tagline: 'Some things only add up later.',
    overview: 'A retired maths teacher tutors the grandson of the man she almost married. Over one winter of fractions, both of them learn to show their working.',
    popularity: 41, homes: [[11, 0.9]], freeOrAds: [38], rentBuy: true,
  },
  {
    id: 900105, type: 'tv', title: 'The Glass Orchard', date: '2024-09-19', runtime: 45, seasons: 1, episodes: 8,
    genres: ['Fantasy', 'Drama'], tagline: 'Nothing grows here by accident.',
    overview: 'In a valley where the fruit trees are made of glass, a young glazier is hired to repair the oldest tree before harvest. The family who owns it would rather she did not look too closely.',
    popularity: 81, homes: [[350, 1], [8, 0.2]], rentBuy: false,
  },
  {
    id: 900106, type: 'movie', title: 'Paper Moons Over Lisbon', date: '2011-11-25', runtime: 109,
    genres: ['Comedy', 'Romance'], tagline: 'Two tickets. One very long tram ride.',
    overview: 'A cartoonist and a tram conductor trade insults for a year before they trade anything else. A gentle comedy about routes, routines and the stops you miss on purpose.',
    popularity: 55, homes: [[9, 0.5], [15, 1]], freeOrAds: [300, 73], rentBuy: true,
  },
  {
    id: 900107, type: 'movie', title: 'Hollow Tide', date: '2022-01-28', runtime: 126,
    genres: ['Horror', 'Mystery'], tagline: 'The sea gave something back.',
    overview: 'After a storm empties the bay, a marine biologist finds a staircase on the seabed leading down. Her research team agrees to go one step further each day.',
    popularity: 69, homes: [[1899, 0.8], [386, 1]], rentBuy: true,
  },
  {
    id: 900108, type: 'tv', title: 'Midnight Cartography', date: '2018-05-07', runtime: 38, seasons: 4, episodes: 40,
    genres: ['Documentary'], tagline: 'Maps of the places that only exist after dark.',
    overview: 'Each episode follows one city between midnight and dawn: bakers, cleaners, astronomers and the people who keep the trains running.',
    popularity: 37, homes: [[8, 0.6], [337, 0.4]], freeOrAds: [300], rentBuy: false,
  },
  {
    id: 900109, type: 'tv', title: 'Kestrel and Finch', date: '2020-10-15', runtime: 28, seasons: 2, episodes: 16,
    genres: ['Comedy', 'Animation'], tagline: 'Partners in very small crimes.',
    overview: 'Two retired birdwatchers run a detective agency out of a garden shed. Their cases are tiny. Their rivalry with the allotment committee is not.',
    popularity: 63, homes: [[531, 0.9], [9, 0.3]], freeOrAds: [73], rentBuy: true,
  },
  {
    id: 900110, type: 'movie', title: 'The Last Projectionist', date: '2025-03-14', runtime: 112,
    genres: ['Drama', 'History'], tagline: 'Every reel ends. Not every story does.',
    overview: 'On the final night of a small-town cinema, its projectionist runs one last programme for an audience of seven. Each of them came for a different film.',
    popularity: 97, homes: [[8, 0.95], [9, 0.6], [350, 0.4], [337, 0.25]], freeOrAds: [300], rentBuy: true,
  },
];

/** A fictional person, so preview search exercises the "drop people" rule. */
const FIXTURE_PERSON = { id: 900901, media_type: 'person', name: 'Marguerite Lanternfield', popularity: 12 };

export const FIXTURE_REGIONS: [string, string][] = [
  ['AR', 'Argentina'], ['AT', 'Austria'], ['AU', 'Australia'], ['BE', 'Belgium'], ['BR', 'Brazil'],
  ['CA', 'Canada'], ['CH', 'Switzerland'], ['CL', 'Chile'], ['CO', 'Colombia'], ['CZ', 'Czech Republic'],
  ['DE', 'Germany'], ['DK', 'Denmark'], ['EE', 'Estonia'], ['ES', 'Spain'], ['FI', 'Finland'],
  ['FR', 'France'], ['GB', 'United Kingdom'], ['GR', 'Greece'], ['HU', 'Hungary'], ['ID', 'Indonesia'],
  ['IE', 'Ireland'], ['IL', 'Israel'], ['IN', 'India'], ['IS', 'Iceland'], ['IT', 'Italy'],
  ['JP', 'Japan'], ['KR', 'South Korea'], ['LT', 'Lithuania'], ['LV', 'Latvia'], ['MX', 'Mexico'],
  ['MY', 'Malaysia'], ['NL', 'Netherlands'], ['NO', 'Norway'], ['NZ', 'New Zealand'], ['PH', 'Philippines'],
  ['PL', 'Poland'], ['PT', 'Portugal'], ['RO', 'Romania'], ['SE', 'Sweden'], ['SG', 'Singapore'],
  ['TH', 'Thailand'], ['TR', 'Turkey'], ['US', 'United States of America'], ['ZA', 'South Africa'],
];

const ALL = FIXTURE_REGIONS.map(([cc]) => cc);
const except = (...cc: string[]) => ALL.filter((c) => !cc.includes(c));

/** Provider id, name, display priority and the regions it operates in. */
export const FIXTURE_PROVIDERS: [number, string, number, string[]][] = [
  [8, 'Netflix', 1, ALL],
  [9, 'Amazon Prime Video', 2, except('IR')],
  [337, 'Disney Plus', 3, except('GR', 'IS', 'LT', 'LV', 'EE', 'RO', 'ID', 'TH', 'MY', 'PH', 'IN')],
  [1899, 'Max', 4, ['US', 'SE', 'NO', 'DK', 'FI', 'ES', 'PT', 'NL', 'PL', 'CZ', 'HU', 'RO', 'BR', 'MX', 'AR', 'CL', 'CO', 'FR', 'BE', 'SG', 'MY', 'TH', 'ID', 'PH']],
  [350, 'Apple TV+', 5, ALL],
  [15, 'Hulu', 6, ['US', 'JP']],
  [531, 'Paramount Plus', 7, ['US', 'CA', 'AU', 'GB', 'IE', 'IT', 'DE', 'AT', 'CH', 'FR', 'KR', 'BR', 'MX', 'AR', 'CL', 'CO']],
  [386, 'Peacock Premium', 8, ['US']],
  [11, 'MUBI', 9, except('ID', 'TH', 'PH', 'KR')],
  [73, 'Tubi TV', 10, ['US', 'CA', 'AU', 'NZ', 'GB', 'MX']],
  [300, 'Pluto TV', 11, ['US', 'CA', 'GB', 'DE', 'AT', 'CH', 'FR', 'ES', 'IT', 'BR', 'MX', 'AR', 'CL', 'CO']],
  [38, 'BBC iPlayer', 12, ['GB']],
  [2, 'Apple TV Store', 13, ALL],
  [3, 'Google Play Movies', 14, except('KR', 'IL')],
  [10, 'Amazon Video', 15, ['US', 'GB', 'DE', 'AT', 'JP']],
  [283, 'Crunchyroll', 16, ALL],
  [192, 'YouTube', 17, ALL],
  [35, 'Rakuten TV', 18, ['ES', 'IT', 'FR', 'DE', 'NL', 'GB', 'PL', 'PT']],
  [76, 'Viaplay', 19, ['SE', 'NO', 'DK', 'FI', 'IS', 'EE', 'LV', 'LT', 'NL', 'PL']],
  [381, 'Canal+', 20, ['FR', 'PL', 'CH', 'AT']],
];

/** Small deterministic PRNG so fixtures are stable across runs. */
function rng(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const providerRef = (id: number) => {
  const p = FIXTURE_PROVIDERS.find((x) => x[0] === id)!;
  return { provider_id: p[0], provider_name: p[1], logo_path: null, display_priority: p[2] };
};

function watchProviders(t: FixtureTitle): Record<string, unknown> {
  const rand = rng(t.id);
  const results: Record<string, Record<string, unknown>> = {};
  const add = (cc: string, key: string, pid: number) => {
    const region = (results[cc] ??= {
      link: `https://www.themoviedb.org/${t.type}/${t.id}/watch?locale=${cc}`,
    });
    const list = ((region[key] as unknown[]) ??= []);
    list.push(providerRef(pid));
  };
  for (const [pid, share] of t.homes) {
    const regions = FIXTURE_PROVIDERS.find((p) => p[0] === pid)![3];
    for (const cc of regions) if (rand() < share) add(cc, 'flatrate', pid);
  }
  for (const pid of t.freeOrAds ?? []) {
    const regions = FIXTURE_PROVIDERS.find((p) => p[0] === pid)![3];
    const key = pid === 38 ? 'free' : 'ads';
    for (const cc of regions) if (rand() < 0.7) add(cc, key, pid);
    if (pid === 300) for (const cc of regions.slice(0, 3)) add(cc, 'free', pid);
  }
  if (t.rentBuy) {
    for (const pid of [2, 3, 10]) {
      const regions = FIXTURE_PROVIDERS.find((p) => p[0] === pid)![3];
      for (const cc of regions) {
        if (rand() < 0.8) add(cc, 'rent', pid);
        if (rand() < 0.85) add(cc, 'buy', pid);
      }
    }
  }
  return { results };
}

const genreId = (name: string) => [...name].reduce((a, c) => a + c.charCodeAt(0), 0);

export function fixtureSearch(query: string): Record<string, unknown> {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  const hit = (s: string) => words.every((w) => s.toLowerCase().includes(w));
  const titles = FIXTURE_TITLES.filter((t) => hit(t.title) || hit(`${t.title} ${t.genres.join(' ')}`))
    .sort((a, b) => Number(hit(b.title)) - Number(hit(a.title)) || b.popularity - a.popularity);
  const results: unknown[] = titles.map((t) =>
    t.type === 'movie'
      ? { id: t.id, media_type: 'movie', title: t.title, release_date: t.date, poster_path: null, overview: t.overview, popularity: t.popularity }
      : { id: t.id, media_type: 'tv', name: t.title, first_air_date: t.date, poster_path: null, overview: t.overview, popularity: t.popularity },
  );
  if (hit(FIXTURE_PERSON.name)) results.push(FIXTURE_PERSON);
  return { page: 1, results, total_results: results.length, total_pages: 1 };
}

export function fixtureTitle(type: 'movie' | 'tv', id: number): Record<string, unknown> | null {
  const t = FIXTURE_TITLES.find((x) => x.id === id && x.type === type);
  if (!t) return null;
  const common = {
    id: t.id,
    genres: t.genres.map((name) => ({ id: genreId(name), name })),
    overview: t.overview,
    tagline: t.tagline,
    poster_path: null,
    backdrop_path: null,
    'watch/providers': watchProviders(t),
  };
  return t.type === 'movie'
    ? { ...common, title: t.title, release_date: t.date, runtime: t.runtime }
    : {
        ...common,
        name: t.title,
        first_air_date: t.date,
        episode_run_time: [t.runtime],
        number_of_seasons: t.seasons,
        number_of_episodes: t.episodes,
      };
}

export function fixtureRegions(): Record<string, unknown> {
  return { results: FIXTURE_REGIONS.map(([cc, name]) => ({ iso_3166_1: cc, english_name: name, native_name: name })) };
}

export function fixtureProviders(): Record<string, unknown> {
  return {
    results: FIXTURE_PROVIDERS.filter(([id]) => id !== 10).map(([id, name, prio]) => ({
      provider_id: id,
      provider_name: name,
      logo_path: null,
      display_priority: prio,
    })),
  };
}

/** Titles to suggest on the home screen in preview. */
export const FIXTURE_FEATURED = [900110, 900102, 900105, 900101, 900107, 900109, 900103, 900106];
