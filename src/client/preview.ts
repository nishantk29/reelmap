/** Preview data source: fictional fixtures run through the live normalizer. */
import { fixtureProviders, fixtureRegions, fixtureSearch, fixtureTitle, FIXTURE_FEATURED, FIXTURE_TITLES } from '../fixtures';
import { normalizeProviderList, normalizeRegions, normalizeSearch, normalizeTitle } from '../shared/normalize';
import type { DataSource } from './api';
import { ApiError } from './api';

/** A short, realistic delay so loading states are visible and testable. */
function delay<T>(ms: number, value: () => T, signal?: AbortSignal): Promise<T> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) return reject(new DOMException('Aborted', 'AbortError'));
    const t = setTimeout(() => {
      try {
        resolve(value());
      } catch (e) {
        reject(e);
      }
    }, ms);
    signal?.addEventListener('abort', () => {
      clearTimeout(t);
      reject(new DOMException('Aborted', 'AbortError'));
    });
  });
}

export const previewSource: DataSource = {
  search: (q, signal) => delay(120, () => normalizeSearch(fixtureSearch(q)), signal),
  title: (type, id, signal) =>
    delay(
      180,
      () => {
        const raw = fixtureTitle(type, id);
        if (!raw) throw new ApiError(404, 'not_found');
        return normalizeTitle(raw, type);
      },
      signal,
    ),
  regions: () => delay(0, () => normalizeRegions(fixtureRegions())),
  providers: () => delay(0, () => normalizeProviderList(fixtureProviders())),
  featured: () =>
    delay(0, () =>
      FIXTURE_FEATURED.map((id) => FIXTURE_TITLES.find((t) => t.id === id)!).map((t) => ({
        id: t.id,
        type: t.type,
        title: t.title,
        year: t.date.slice(0, 4),
        poster: null,
        overview: t.overview,
      })),
    ),
};
