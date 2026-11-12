/**
 * Search field with a live results list, following the ARIA 1.2 combobox
 * pattern: arrow keys move the active option, Enter opens it, Escape closes.
 */
import { api } from './api';
import { announce, clear, h, nextId } from './dom';
import { icon } from './icons';
import { poster } from './poster';
import type { SearchItem } from '../shared/types';

export interface SearchOpts {
  onPick(item: SearchItem): void;
  onSubmit(q: string): void;
  initial?: string;
  compact?: boolean;
}

const DEBOUNCE_MS = 200;

export function searchBox(opts: SearchOpts): HTMLElement {
  const listId = nextId('results');
  const hintId = nextId('hint');
  const input = h('input', {
    id: 'search',
    class: 'search-input',
    type: 'search',
    role: 'combobox',
    'aria-expanded': 'false',
    'aria-controls': listId,
    'aria-autocomplete': 'list',
    'aria-describedby': hintId,
    autocomplete: 'off',
    autocapitalize: 'off',
    spellcheck: 'false',
    enterkeyhint: 'search',
    maxlength: 100,
    placeholder: 'Search a movie or show',
    'aria-label': 'Search movies and shows',
  });
  input.value = opts.initial ?? '';
  const list = h('ul', { id: listId, class: 'results', role: 'listbox', 'aria-label': 'Suggestions', hidden: true });
  const status = h('div', { class: 'results-status', hidden: true });
  const panel = h('div', { class: 'results-panel', hidden: true }, status, list);
  const hint = h('p', { id: hintId, class: 'search-hint' }, 'Press ', h('kbd', null, '/'), ' to search from anywhere. Use arrow keys to move through results.');

  let items: SearchItem[] = [];
  let active = -1;
  let timer = 0;
  let ctrl: AbortController | null = null;
  let lastQuery = '';

  const setOpen = (open: boolean) => {
    panel.hidden = !open;
    input.setAttribute('aria-expanded', String(open && !list.hidden));
    if (!open) setActive(-1);
  };

  const setActive = (i: number) => {
    active = i;
    [...list.children].forEach((li, j) => li.setAttribute('aria-selected', String(j === i)));
    const el = list.children[i] as HTMLElement | undefined;
    if (el) {
      input.setAttribute('aria-activedescendant', el.id);
      el.scrollIntoView({ block: 'nearest' });
    } else input.removeAttribute('aria-activedescendant');
  };

  const showStatus = (text: string, kind: 'empty' | 'error' | 'loading') => {
    list.hidden = kind !== 'loading';
    status.hidden = kind === 'loading';
    status.dataset.kind = kind;
    status.textContent = text;
    if (kind === 'loading') {
      clear(list, ...[0, 1, 2].map(() => h('li', { class: 'result skeleton', 'aria-hidden': 'true' }, h('span', { class: 'sk sk-poster' }), h('span', { class: 'sk-lines' }, h('span', { class: 'sk sk-line' }), h('span', { class: 'sk sk-line short' })))));
      list.removeAttribute('role');
    }
    setOpen(true);
  };

  const render = (q: string) => {
    list.setAttribute('role', 'listbox');
    if (!items.length) {
      showStatus(`Nothing matches "${q}". Check the spelling or try the original title.`, 'empty');
      announce('No results');
      return;
    }
    status.hidden = true;
    list.hidden = false;
    clear(
      list,
      items.slice(0, 8).map((it, i) =>
        h(
          'li',
          {
            id: `${listId}-${i}`,
            class: 'result',
            role: 'option',
            'aria-selected': 'false',
            onmousedown: (e: Event) => e.preventDefault(),
            onclick: () => pick(i),
          },
          poster({ title: it.title, year: it.year, type: it.type, path: it.poster, sizes: '40px', decorative: true }),
          h(
            'span',
            { class: 'result-text' },
            h('span', { class: 'result-title' }, it.title),
            h('span', { class: 'result-meta' }, [it.type === 'tv' ? 'Series' : 'Movie', it.year].filter(Boolean).join(' · ')),
          ),
          icon('chevron', 'icon result-go'),
        ),
      ),
    );
    setOpen(true);
    input.setAttribute('aria-expanded', 'true');
    announce(`${Math.min(items.length, 8)} result${items.length === 1 ? '' : 's'}. Use up and down arrows to choose.`);
  };

  const run = async (q: string) => {
    ctrl?.abort();
    ctrl = new AbortController();
    lastQuery = q;
    showStatus('', 'loading');
    try {
      items = await api.search(q, ctrl.signal);
      if (q !== lastQuery) return;
      active = -1;
      render(q);
    } catch (err) {
      if ((err as Error).name === 'AbortError') return;
      items = [];
      showStatus('Search is not answering right now. Try again in a moment.', 'error');
    }
  };

  const pick = (i: number) => {
    const it = items[i];
    if (!it) return;
    setOpen(false);
    opts.onPick(it);
  };

  input.addEventListener('input', () => {
    window.clearTimeout(timer);
    const q = input.value.trim();
    if (!q) {
      ctrl?.abort();
      items = [];
      setOpen(false);
      return;
    }
    timer = window.setTimeout(() => void run(q), DEBOUNCE_MS);
  });

  input.addEventListener('keydown', (e) => {
    const n = Math.min(items.length, 8);
    const open = !panel.hidden && !list.hidden && n > 0;
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        if (!open && items.length) {
          render(lastQuery);
          setActive(0);
        }
        else if (n) setActive(active < n - 1 ? active + 1 : 0);
        break;
      case 'ArrowUp':
        e.preventDefault();
        if (n) setActive(active > 0 ? active - 1 : n - 1);
        break;
      case 'Home':
      case 'End':
        if (open && active >= 0) {
          e.preventDefault();
          setActive(e.key === 'Home' ? 0 : n - 1);
        }
        break;
      case 'Enter':
        e.preventDefault();
        if (open && active >= 0) pick(active);
        else if (input.value.trim()) {
          setOpen(false);
          opts.onSubmit(input.value.trim());
        }
        break;
      case 'Escape':
        if (!panel.hidden) {
          e.preventDefault();
          setOpen(false);
        } else if (input.value) {
          e.preventDefault();
          input.value = '';
        }
        break;
    }
  });

  input.addEventListener('blur', () => window.setTimeout(() => setOpen(false), 120));
  input.addEventListener('focus', () => {
    if (items.length && input.value.trim()) render(lastQuery);
  });

  return h(
    'div',
    { class: ['search', opts.compact && 'search-compact'] },
    h('div', { class: 'search-anchor' }, h('label', { class: 'search-field' }, icon('search', 'icon search-icon'), input), panel),
    opts.compact ? null : hint,
  );
}
