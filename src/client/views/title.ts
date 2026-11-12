import { api, ApiError, getMode, visitorCountry } from '../api';
import { countryName, flag } from '../countries';
import { announce, clear, h } from '../dom';
import { icon } from '../icons';
import { backdrop, poster, providerLogo } from '../poster';
import { navigate, setParam } from '../router';
import { searchBox } from '../search';
import { onChange, prefs } from '../store';
import { openServicesSheet } from '../services-sheet';
import { openWatchSheet } from '../watch-sheet';
import { countryMatcher, groupAvailability, regionSummary, type ServiceGroup } from '../../shared/availability';
import { OFFER_LABELS, OFFER_TYPES, type OfferType, type TitleDetail } from '../../shared/types';

const CHIP_LIMIT = 16;

function metaLine(d: TitleDetail): string {
  const parts: string[] = [d.type === 'tv' ? 'Series' : 'Movie'];
  if (d.year) parts.push(d.year);
  if (d.type === 'movie' && d.runtime) {
    const hrs = Math.floor(d.runtime / 60);
    parts.push(hrs ? `${hrs} h ${d.runtime % 60} min` : `${d.runtime} min`);
  }
  if (d.type === 'tv' && d.seasons) parts.push(`${d.seasons} season${d.seasons === 1 ? '' : 's'}`);
  if (d.type === 'tv' && d.runtime) parts.push(`${d.runtime} min episodes`);
  return parts.join(' · ');
}

function skeleton(): HTMLElement {
  return h(
    'div',
    { class: 'wrap title-skeleton', 'aria-hidden': 'true' },
    h('span', { class: 'sk sk-backdrop' }),
    h('div', { class: 'sk-row' }, h('span', { class: 'sk sk-poster-lg' }), h('span', { class: 'sk-lines' }, h('span', { class: 'sk sk-h1' }), h('span', { class: 'sk sk-line' }), h('span', { class: 'sk sk-line' }), h('span', { class: 'sk sk-line short' }))),
  );
}

export function renderTitle(main: HTMLElement, type: 'movie' | 'tv', id: number): () => void {
  const ctrl = new AbortController();
  const top = h(
    'div',
    { class: 'wrap title-top' },
    h('a', { class: 'back', href: '/' }, icon('back'), 'Search'),
    searchBox({
      compact: true,
      onPick: (it) => {
        prefs.addRecent(it);
        navigate(`/title/${it.type}/${it.id}`);
      },
      onSubmit: (q) => navigate(`/search?q=${encodeURIComponent(q)}`),
    }),
  );
  const body = h('div', { class: 'title-body', 'aria-busy': 'true' }, skeleton());
  main.append(top, body);
  let off: (() => void) | null = null;

  const load = () => {
    body.setAttribute('aria-busy', 'true');
    clear(body, skeleton());
    api
      .title(type, id, ctrl.signal)
      .then((d) => {
        body.removeAttribute('aria-busy');
        document.title = `${d.title}${d.year ? ` (${d.year})` : ''} · Where to watch · Reelmap`;
        prefs.addRecent({ id: d.id, type: d.type, title: d.title, year: d.year, poster: d.poster, overview: '' });
        off = mount(body, d);
      })
      .catch((err: Error) => {
        if (err.name === 'AbortError') return;
        body.removeAttribute('aria-busy');
        const missing = err instanceof ApiError && err.status === 404;
        clear(
          body,
          h(
            'div',
            { class: 'wrap page-msg', role: 'alert' },
            h('h1', { class: 'display', tabindex: -1 }, missing ? 'We could not find this title' : 'This title did not load'),
            h('p', null, missing ? 'It may have been removed from TMDB, or the link is wrong. Search for it again.' : 'Check your connection, then try again.'),
            missing ? h('a', { class: 'btn btn-outline', href: '/' }, 'Go to search') : h('button', { class: 'btn btn-outline', type: 'button', onclick: load }, 'Try again'),
          ),
        );
      });
  };
  load();
  return () => {
    ctrl.abort();
    off?.();
  };
}

function mount(root: HTMLElement, d: TitleDetail): () => void {
  const live = getMode() === 'live';
  const params = new URLSearchParams(location.search);
  const available = d.regions.map((r) => r.cc).sort((a, b) => countryName(a).localeCompare(countryName(b)));
  const pickDefault = (): string | null => {
    for (const c of [params.get('in')?.toUpperCase(), prefs.region(), visitorCountry(), 'US', 'GB']) if (c && available.includes(c)) return c;
    return available[0] ?? null;
  };

  const state = {
    types: new Set<OfferType>(),
    onlyMine: prefs.onlyMine(),
    query: '',
    region: pickDefault(),
    mine: prefs.myServices(),
  };

  /* ---------- hero ---------- */
  const hero = h(
    'section',
    { class: 'hero' },
    backdrop(d.title, d.backdrop),
    h(
      'div',
      { class: 'wrap hero-inner' },
      poster({ title: d.title, year: d.year, type: d.type, path: d.poster, sizes: '(min-width: 1024px) 240px, 128px', eager: true }),
      h(
        'div',
        { class: 'hero-text' },
        h('h1', { class: 'display title-h', tabindex: -1, 'data-testid': 'title-heading' }, d.title),
        h('p', { class: 'title-meta tnum' }, metaLine(d)),
        d.genres.length ? h('ul', { class: 'tags', 'aria-label': 'Genres' }, d.genres.map((g) => h('li', { class: 'tag' }, g))) : null,
      ),
    ),
  );
  const about = h(
    'div',
    { class: 'wrap overview' },
    d.tagline ? h('p', { class: 'tagline' }, d.tagline) : null,
    h('p', null, d.overview || 'No overview yet.'),
  );

  if (!d.regions.length) {
    clear(
      root,
      hero,
      about,
      h(
        'section',
        { class: 'wrap section' },
        h('h2', { class: 'section-h' }, 'Where to watch'),
        h('p', { class: 'empty' }, 'No country lists this title on a streaming, rental or store service yet. New releases often appear a few weeks after cinemas.'),
        jwLine(null),
      ),
    );
    return () => {};
  }

  /* ---------- region panel ---------- */
  const regionSelect = h(
    'select',
    { id: 'region-select', class: 'select', 'data-testid': 'region-select' },
    available.map((cc) => h('option', { value: cc }, `${flag(cc)} ${countryName(cc)}`)),
  );
  const regionList = h('div', { class: 'region-list', 'aria-live': 'polite' });
  const regionPanel = h(
    'section',
    { class: 'panel region-panel', id: 'region', 'aria-labelledby': 'region-h', 'data-testid': 'region-panel' },
    h('h2', { id: 'region-h', class: 'panel-h' }, h('label', { for: 'region-select' }, 'Where can I watch from')),
    regionSelect,
    regionList,
  );
  regionSelect.addEventListener('change', () => setRegion(regionSelect.value, false));

  const setRegion = (cc: string, scroll: boolean) => {
    state.region = cc;
    regionSelect.value = cc;
    prefs.setRegion(cc);
    setParam('in', cc);
    renderRegion();
    if (scroll) {
      regionPanel.scrollIntoView({ block: 'start', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
      regionSelect.focus({ preventScroll: true });
    }
  };

  const renderRegion = () => {
    const cc = state.region;
    if (!cc) return clear(regionList, h('p', { class: 'empty' }, 'Pick a country.'));
    regionSelect.value = cc;
    const sum = regionSummary(d, cc, state.mine, state.types);
    const name = countryName(cc);
    clear(
      regionList,
      sum.entries.length
        ? h(
            'ul',
            { class: 'region-entries' },
            sum.entries.map((e, i) =>
              h(
                'li',
                { class: ['region-entry', e.mine && 'is-mine'] },
                providerLogo(e.provider.name, e.provider.logo, live),
                h(
                  'span',
                  { class: 'region-entry-text' },
                  h('span', { class: 'svc-name' }, e.provider.name, e.mine ? h('span', { class: 'mine-tag' }, 'Yours') : null),
                  h('span', { class: 'svc-types' }, e.types.map((t) => OFFER_LABELS[t]).join(', ')),
                ),
                h(
                  'button',
                  {
                    class: ['btn', i === 0 ? 'btn-accent' : 'btn-outline', 'btn-sm'],
                    type: 'button',
                    'data-testid': i === 0 ? 'watch-primary' : null,
                    'aria-label': `Watch it on ${e.provider.name} from ${name}`,
                    onclick: () => openWatchSheet({ detail: d, providerId: e.provider.id, cc }),
                  },
                  icon('play'),
                  'Watch it',
                ),
              ),
            ),
          )
        : h('p', { class: 'empty' }, state.types.size ? `Nothing in ${name} for the selected types. Clear the type filters to see more.` : `Nothing listed in ${name}. Pick another country.`),
      sum.link ? h('p', { class: 'small more' }, h('a', { href: sum.link, rel: 'noopener', target: '_blank' }, `More options in ${name}`, icon('external', 'icon icon-inline'))) : null,
    );
  };

  /* ---------- availability ---------- */
  const typeGroup = h('div', { class: 'chips', role: 'group', 'aria-label': 'Offer types' });
  const mineBtn = h('button', { class: 'chip chip-toggle', type: 'button', 'data-testid': 'only-mine', 'aria-pressed': String(state.onlyMine) }, icon('check', 'icon chip-check'), 'Only my services');
  const countryInput = h('input', {
    id: 'country-filter',
    class: 'input',
    type: 'search',
    placeholder: 'Filter by country',
    'aria-label': 'Filter by country name or code',
    autocomplete: 'off',
    maxlength: 40,
    'data-testid': 'country-filter',
  });
  const countryHint = h('div', { class: 'country-hint' });
  const summary = h('p', { class: 'summary tnum', 'aria-live': 'polite', 'data-testid': 'summary' });
  const cards = h('ul', { class: 'services', 'data-testid': 'services' });

  mineBtn.addEventListener('click', () => {
    if (!state.mine.size && !state.onlyMine) {
      openServicesSheet(Object.values(d.providers));
      return;
    }
    state.onlyMine = !state.onlyMine;
    prefs.setOnlyMine(state.onlyMine);
    renderAll();
  });
  let qTimer = 0;
  countryInput.addEventListener('input', () => {
    window.clearTimeout(qTimer);
    qTimer = window.setTimeout(() => {
      state.query = countryInput.value.trim();
      renderList();
    }, 120);
  });

  const availability = h(
    'section',
    { class: 'availability', 'aria-labelledby': 'avail-h' },
    h('div', { class: 'avail-head' }, h('h2', { id: 'avail-h', class: 'section-h' }, 'Available by service'), summary),
    h('div', { class: 'toolbar' }, typeGroup, h('div', { class: 'toolbar-row' }, mineBtn, h('label', { class: 'country-field' }, icon('globe', 'icon field-icon'), countryInput))),
    countryHint,
    cards,
    jwLine(null),
  );

  const renderTypes = (counts: Record<OfferType, number>) => {
    clear(
      typeGroup,
      OFFER_TYPES.map((t) =>
        h(
          'button',
          {
            class: ['chip', 'chip-toggle', !counts[t] && 'is-empty'],
            type: 'button',
            'aria-pressed': String(state.types.has(t)),
            'data-type': t,
            onclick: () => {
              if (state.types.has(t)) state.types.delete(t);
              else state.types.add(t);
              renderAll();
              (typeGroup.querySelector(`[data-type="${t}"]`) as HTMLElement | null)?.focus();
            },
          },
          icon('check', 'icon chip-check'),
          OFFER_LABELS[t],
          h('span', { class: 'chip-count tnum' }, String(counts[t])),
        ),
      ),
    );
  };

  const expanded = new Set<string>();

  const card = (g: ServiceGroup) => {
    const pid = g.provider.id;
    const firstCc = state.region && g.countries.includes(state.region) ? state.region : g.countries[0]!;
    return h(
      'li',
      { class: ['service', g.mine && 'is-mine'], 'data-provider': String(pid) },
      h(
        'div',
        { class: 'service-head' },
        providerLogo(g.provider.name, g.provider.logo, live),
        h('h3', { class: 'svc-name' }, g.provider.name, g.mine ? h('span', { class: 'mine-tag' }, 'Yours') : null),
        h('span', { class: 'svc-count tnum' }, `${g.countries.length} ${g.countries.length === 1 ? 'country' : 'countries'}`),
      ),
      OFFER_TYPES.filter((t) => g.byType[t]?.length).map((t) => {
        const list = g.byType[t]!;
        const key = `${pid}:${t}`;
        const open = expanded.has(key) || list.length <= CHIP_LIMIT + 2;
        const shown = open ? list : list.slice(0, CHIP_LIMIT);
        return h(
          'div',
          { class: 'offer', 'data-offer': t },
          h('h4', { class: 'offer-h' }, OFFER_LABELS[t], h('span', { class: 'tnum offer-n' }, String(list.length))),
          h(
            'ul',
            { class: 'cc-chips' },
            shown.map((cc) =>
              h(
                'li',
                null,
                h(
                  'button',
                  {
                    class: ['cc', cc === state.region && 'is-here'],
                    type: 'button',
                    title: countryName(cc),
                    'aria-label': `${countryName(cc)}: watch on ${g.provider.name}`,
                    onclick: () => openWatchSheet({ detail: d, providerId: pid, cc }),
                  },
                  h('span', { class: 'flag', 'aria-hidden': 'true' }, flag(cc)),
                  h('span', { class: 'cc-code' }, cc),
                ),
              ),
            ),
            open
              ? null
              : h(
                  'li',
                  null,
                  h('button', { class: 'cc cc-more', type: 'button', onclick: () => { expanded.add(key); renderList(); } }, `Show ${list.length - CHIP_LIMIT} more`),
                ),
          ),
        );
      }),
      h(
        'div',
        { class: 'service-foot' },
        h(
          'button',
          { class: 'btn btn-outline btn-sm', type: 'button', onclick: () => openWatchSheet({ detail: d, providerId: pid, cc: firstCc }) },
          icon('play'),
          `Watch it from ${countryName(firstCc)}`,
        ),
      ),
    );
  };

  const renderList = () => {
    const r = groupAvailability(d, { types: state.types, onlyMine: state.onlyMine, mine: state.mine, countryQuery: state.query, countryName });
    renderTypes(r.counts);
    mineBtn.setAttribute('aria-pressed', String(state.onlyMine));
    const n = r.groups.length;
    summary.textContent = n ? `${n} ${n === 1 ? 'service' : 'services'} in ${r.countryCount} ${r.countryCount === 1 ? 'country' : 'countries'}` : 'No matches';

    // Country search: when the text points at one country, offer its region view.
    clear(countryHint);
    if (state.query) {
      const match = countryMatcher(state.query, countryName);
      const hits = available.filter(match);
      if (hits.length === 1 || (hits.length > 1 && hits.some((c) => c.toLowerCase() === state.query.toLowerCase()))) {
        const cc = hits.length === 1 ? hits[0]! : hits.find((c) => c.toLowerCase() === state.query.toLowerCase())!;
        countryHint.append(
          h('button', { class: 'link-btn', type: 'button', 'data-testid': 'country-jump', onclick: () => setRegion(cc, true) }, `${flag(cc)} See everything from ${countryName(cc)}`, icon('chevron', 'icon icon-inline')),
        );
      } else if (!hits.length) {
        countryHint.append(h('p', { class: 'empty' }, `No country matching "${state.query}" carries this title.`));
      }
    }

    if (!n) {
      clear(
        cards,
        h(
          'li',
          { class: 'empty-card' },
          h('p', null, state.onlyMine ? 'None of your services carry this title with these filters.' : 'No services match these filters.'),
          h(
            'button',
            {
              class: 'btn btn-outline btn-sm',
              type: 'button',
              onclick: () => {
                state.types.clear();
                state.onlyMine = false;
                prefs.setOnlyMine(false);
                state.query = '';
                countryInput.value = '';
                renderAll();
              },
            },
            'Clear filters',
          ),
        ),
      );
    } else clear(cards, r.groups.map(card));
  };

  const renderAll = () => {
    renderList();
    renderRegion();
  };

  clear(
    root,
    hero,
    h('div', { class: 'wrap title-grid' }, h('aside', { class: 'title-aside' }, about, regionPanel), availability),
  );
  // Overview sits beside the region panel on desktop, under the hero on phones.
  about.classList.remove('wrap');
  renderAll();
  announce(`${d.title} loaded.`);

  return onChange((name) => {
    if (name === 'services') {
      state.mine = prefs.myServices();
      if (!state.mine.size) state.onlyMine = false;
      renderAll();
    }
  });
}

function jwLine(link: string | null): HTMLElement {
  return h(
    'p',
    { class: 'small jw' },
    'Streaming data from ',
    h('a', { href: 'https://www.justwatch.com', rel: 'noopener', target: '_blank' }, 'JustWatch'),
    ' via TMDB. Catalogs change often.',
    link ? [' ', h('a', { href: link, rel: 'noopener', target: '_blank' }, 'More options')] : null,
  );
}
