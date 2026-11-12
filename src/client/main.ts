import './styles.css';
import { getMode, init, onModeChange } from './api';
import { clear, h } from './dom';
import { icon, mark } from './icons';
import { parse, start, type Route } from './router';
import { prefs, type ThemePref } from './store';
import { openServicesSheet } from './services-sheet';
import { openSettingsSheet } from './settings-sheet';
import { renderHome } from './views/home';
import { renderTitle } from './views/title';
import { renderNotFound } from './views/notfound';

const main = document.getElementById('main')!;
const masthead = document.getElementById('masthead')!;
const banner = document.getElementById('banner')!;

let cleanup: (() => void) | void;

/* ---------- theme ---------- */

const media = window.matchMedia('(prefers-color-scheme: dark)');
function effectiveTheme(): 'light' | 'dark' {
  const t = prefs.theme();
  return t === 'system' ? (media.matches ? 'dark' : 'light') : t;
}
export function applyTheme(t: ThemePref = prefs.theme()): void {
  if (t === 'system') delete document.documentElement.dataset.theme;
  else document.documentElement.dataset.theme = t;
  const btn = document.getElementById('theme-toggle');
  if (btn) {
    const dark = effectiveTheme() === 'dark';
    btn.setAttribute('aria-label', dark ? 'Switch to light theme' : 'Switch to dark theme');
    btn.setAttribute('aria-pressed', String(dark));
    clear(btn, icon(dark ? 'sun' : 'moon'));
  }
}
media.addEventListener('change', () => applyTheme());

/* ---------- shell ---------- */

function renderMasthead(): void {
  const themeBtn = h('button', { id: 'theme-toggle', class: 'icon-btn', type: 'button' });
  themeBtn.addEventListener('click', () => {
    const next = effectiveTheme() === 'dark' ? 'light' : 'dark';
    prefs.setTheme(next);
    applyTheme(next);
  });
  clear(
    masthead,
    h(
      'div',
      { class: 'wrap masthead-row' },
      h('a', { class: 'brand', href: '/', 'aria-label': 'Reelmap home' }, mark(), h('span', { class: 'brand-name' }, 'Reelmap')),
      h(
        'nav',
        { class: 'masthead-nav', 'aria-label': 'Preferences' },
        h('button', { class: 'nav-btn', type: 'button', 'data-testid': 'open-services', onclick: () => openServicesSheet() }, icon('list'), h('span', { class: 'nav-label' }, 'My services')),
        h('button', { class: 'nav-btn', type: 'button', 'data-testid': 'open-settings', onclick: () => openSettingsSheet(applyTheme) }, icon('sliders'), h('span', { class: 'nav-label' }, 'My VPN')),
        themeBtn,
      ),
    ),
  );
  applyTheme();
}

function renderBanner(): void {
  if (getMode() !== 'preview') {
    banner.hidden = true;
    return;
  }
  banner.hidden = false;
  clear(
    banner,
    h(
      'div',
      { class: 'wrap banner', role: 'status', 'data-testid': 'preview-banner' },
      icon('info'),
      h('p', null, h('strong', null, 'Preview mode. '), "Live data isn't connected yet. You're looking at sample titles."),
    ),
  );
}

/* ---------- routing ---------- */

const TITLES: Record<Route['name'], string> = {
  home: 'Reelmap: where is it streaming?',
  search: 'Search results · Reelmap',
  title: 'Reelmap',
  about: 'How it works · Reelmap',
  notfound: 'Page not found · Reelmap',
};

let firstRender = true;
function render(): void {
  cleanup?.();
  const route = parse(location);
  document.title = TITLES[route.name];
  document.body.dataset.route = route.name;
  main.replaceChildren();
  if (route.name === 'title') cleanup = renderTitle(main, route.type, route.id);
  else if (route.name === 'notfound') cleanup = renderNotFound(main);
  else cleanup = renderHome(main, route);
  if (!firstRender && route.name !== 'about') {
    window.scrollTo(0, 0);
    main.focus({ preventScroll: true });
  }
  firstRender = false;
}

/* ---------- global keys ---------- */

document.addEventListener('keydown', (e) => {
  if (e.key !== '/' || e.metaKey || e.ctrlKey || e.altKey) return;
  const t = e.target as HTMLElement;
  if (t.closest('input, textarea, select, [contenteditable="true"], dialog')) return;
  const input = document.getElementById('search') as HTMLInputElement | null;
  if (input) {
    e.preventDefault();
    input.focus();
    input.select();
  }
});

/* ---------- boot ---------- */

renderMasthead();
onModeChange(renderBanner);
void init().then(() => {
  renderBanner();
  start(render);
});
