import { api, getMode } from '../api';
import { clear, h } from '../dom';
import { poster } from '../poster';
import { navigate, type Route } from '../router';
import { searchBox } from '../search';
import { prefs } from '../store';
import type { SearchItem } from '../../shared/types';

const titleHref = (it: { type: string; id: number }) => `/title/${it.type}/${it.id}`;

export function titleGrid(items: SearchItem[], testid: string): HTMLElement {
  return h(
    'ul',
    { class: 'grid', 'data-testid': testid },
    items.map((it) =>
      h(
        'li',
        null,
        h(
          'a',
          { class: 'card-title', href: titleHref(it) },
          poster({ title: it.title, year: it.year, type: it.type, path: it.poster, sizes: '(min-width: 1024px) 180px, 45vw', decorative: true }),
          h('span', { class: 'card-name' }, it.title),
          h('span', { class: 'card-meta' }, [it.type === 'tv' ? 'Series' : 'Movie', it.year].filter(Boolean).join(' · ')),
        ),
      ),
    ),
  );
}

function skeletonGrid(n: number): HTMLElement {
  return h(
    'ul',
    { class: 'grid', 'aria-hidden': 'true' },
    Array.from({ length: n }, () => h('li', null, h('span', { class: 'sk sk-card' }), h('span', { class: 'sk sk-line' }))),
  );
}

/** A quiet programme card beside the search on wide screens. */
function ticket(): HTMLElement {
  return h(
    'aside',
    { class: 'ticket', 'aria-label': 'What Reelmap shows' },
    h('p', { class: 'ticket-kicker' }, 'Tonight\'s programme'),
    h(
      'dl',
      { class: 'ticket-rows' },
      h('div', null, h('dt', null, 'Every country'), h('dd', null, 'One page per title, grouped by service')),
      h('div', null, h('dt', null, 'Five ways to watch'), h('dd', null, 'Stream, free, with ads, rent and buy')),
      h('div', null, h('dt', null, 'Your services first'), h('dd', null, 'Saved in this browser, never sent anywhere')),
      h('div', null, h('dt', null, 'Watch it'), h('dd', null, 'A shortcut, a command or plain steps for your VPN')),
    ),
  );
}

export function howItWorks(): HTMLElement {
  return h(
    'section',
    { class: 'wrap section', id: 'how', 'aria-labelledby': 'how-h' },
    h('h2', { id: 'how-h', class: 'section-h' }, 'How it works'),
    h(
      'ol',
      { class: 'steps' },
      h('li', null, h('h3', null, 'Search a title'), h('p', null, 'Type a movie or show. Results come from TMDB and update as you type.')),
      h('li', null, h('h3', null, 'See every country'), h('p', null, 'Each service lists the countries that carry the title, split into stream, free, ads, rent and buy.')),
      h('li', null, h('h3', null, 'Pick a region and watch'), h('p', null, 'Choose a country and service. Watch it gives you a shortcut, a command or plain steps to switch your VPN first.')),
    ),
    h('h3', { class: 'sub-h' }, 'Tips'),
    h(
      'ul',
      { class: 'tips' },
      h('li', null, 'Catalogs change every month. Check the date your service shows before you plan a movie night.'),
      h('li', null, 'Availability comes from JustWatch through TMDB. It is usually right, but not always.'),
      h('li', null, 'After switching your VPN, fully close and reopen the streaming app so it re-detects your region.'),
      h('li', null, 'Some services block VPN connections or limit them in their terms. Reelmap cannot change that, and does not try to.'),
      h('li', null, 'Your saved services and VPN stay in this browser. Nothing is sent to a server.'),
    ),
  );
}

export function credits(): HTMLElement {
  return h(
    'section',
    { class: 'wrap section credits', id: 'about', 'aria-labelledby': 'about-h' },
    h('h2', { id: 'about-h', class: 'section-h' }, 'About and credits'),
    h(
      'div',
      { class: 'credits-grid' },
      h(
        'div',
        null,
        h('p', null, 'Reelmap is a small, independent tool for travellers and VPN users. It has no ads, no accounts and no affiliate links.'),
        h('p', null, 'It cannot switch your VPN for you. A web page has no access to that. Watch it explains exactly what each option does.'),
      ),
      h(
        'div',
        { class: 'attrib' },
        h('a', { class: 'tmdb-link', href: 'https://www.themoviedb.org', rel: 'noopener', target: '_blank' }, h('img', { class: 'tmdb-logo', src: '/img/tmdb-logo.svg', width: 108, height: 14, alt: 'TMDB' })),
        h('p', { class: 'small' }, 'This product uses the TMDB API but is not endorsed or certified by TMDB.'),
        h('p', { class: 'small' }, 'Streaming data from ', h('a', { href: 'https://www.justwatch.com', rel: 'noopener', target: '_blank' }, 'JustWatch'), '.'),
      ),
    ),
  );
}

export function renderHome(main: HTMLElement, route: Route): () => void {
  const q = route.name === 'search' ? route.q : '';
  if (q) document.title = `${q} · Reelmap`;
  const box = searchBox({
    initial: q,
    onPick: (it) => {
      prefs.addRecent(it);
      navigate(titleHref(it));
    },
    onSubmit: (text) => navigate(`/search?q=${encodeURIComponent(text)}`),
  });

  const hero = h(
    'section',
    { class: 'wrap hero-home' },
    h(
      'div',
      { class: 'hero-main' },
      h('h1', { class: 'display', tabindex: -1 }, 'Where is it streaming?'),
      h('p', { class: 'lede' }, 'Search a movie or show. See every country and service that carries it, then pick a region and watch.'),
      box,
    ),
    ticket(),
  );
  main.append(hero);

  const results = h('section', { class: 'wrap section', 'aria-live': 'polite' });
  main.append(results);
  const ctrl = new AbortController();

  if (q) {
    clear(results, h('h2', { class: 'section-h' }, `Results for "${q}"`), skeletonGrid(6));
    api
      .search(q, ctrl.signal)
      .then((items) => {
        clear(
          results,
          h('h2', { class: 'section-h' }, `Results for "${q}"`),
          items.length
            ? titleGrid(items, 'results-grid')
            : h('p', { class: 'empty' }, 'Nothing matches. Check the spelling, or try the original title or the release year.'),
        );
      })
      .catch((err: Error) => {
        if (err.name !== 'AbortError') clear(results, h('p', { class: 'empty' }, 'Search is not answering right now. Try again in a moment.'));
      });
  } else {
    const recent = prefs.recent();
    if (recent.length) results.append(h('h2', { class: 'section-h' }, 'Recently viewed'), titleGrid(recent, 'recent-grid'));
    if (getMode() === 'preview') {
      const sample = h('div', null, h('h2', { class: 'section-h' }, 'Sample titles'), skeletonGrid(8));
      results.append(sample);
      void api.featured?.().then((items) => clear(sample, h('h2', { class: 'section-h' }, 'Sample titles'), h('p', { class: 'section-note' }, 'These films and shows are made up, so you can try every feature before live data is connected.'), titleGrid(items, 'featured-grid')));
    }
  }

  main.append(howItWorks(), credits());
  if (route.name === 'about') {
    document.getElementById('about')?.scrollIntoView();
    document.getElementById('how')?.scrollIntoView();
  }
  return () => ctrl.abort();
}

