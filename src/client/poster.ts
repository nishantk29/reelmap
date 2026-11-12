/**
 * Posters. Live mode uses TMDB images with srcset. Preview mode (and titles
 * with no artwork) get a generated typographic poster: flat duotone, one
 * seeded shape, the title set in the display face. No gradients.
 */
import { h, s } from './dom';
import type { MediaType } from '../shared/types';

const IMG = 'https://image.tmdb.org/t/p/';

/** Muted cinema-program duotones: [ground, ink, shape]. */
const PALETTES: [string, string, string][] = [
  ['#5b1f1a', '#f1e4cf', '#8c3a2b'],
  ['#1f3a3d', '#e9dfc8', '#2f5a5c'],
  ['#1d2440', '#eadcb0', '#34406b'],
  ['#3f4128', '#efe7d2', '#626640'],
  ['#41263b', '#ecd9cf', '#6a3f5f'],
  ['#2a2622', '#e8c27a', '#4a423a'],
  ['#e8dcc6', '#2b2521', '#c9b48f'],
  ['#d9c9b0', '#3a1d17', '#b08060'],
];

export function hash(str: string): number {
  let h1 = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h1 ^= str.charCodeAt(i);
    h1 = Math.imul(h1, 16777619);
  }
  // Murmur3 finalizer so every bit is well mixed.
  h1 ^= h1 >>> 16;
  h1 = Math.imul(h1, 0x85ebca6b);
  h1 ^= h1 >>> 13;
  h1 = Math.imul(h1, 0xc2b2ae35);
  h1 ^= h1 >>> 16;
  return h1 >>> 0;
}

function wrap(title: string, maxChars: number, maxLines: number): string[] {
  const words = title.split(/\s+/);
  const lines: string[] = [];
  let cur = '';
  for (const w of words) {
    if (cur && (cur + ' ' + w).length > maxChars) {
      lines.push(cur);
      cur = w;
    } else cur = cur ? cur + ' ' + w : w;
  }
  if (cur) lines.push(cur);
  if (lines.length > maxLines) {
    const kept = lines.slice(0, maxLines);
    kept[maxLines - 1] = kept[maxLines - 1]!.replace(/\s*\S*$/, '') + '…';
    return kept;
  }
  return lines;
}

function shape(seed: number, w: number, hgt: number, fill: string, ink: string): SVGElement[] {
  const v = (seed >>> 4) % 4;
  if (v === 0) {
    // A low sun over a horizon line.
    return [
      s('circle', { cx: w * 0.62, cy: hgt * 0.42, r: w * 0.3, fill }),
      s('path', { d: `M0 ${hgt * 0.58}H${w}`, stroke: ink, 'stroke-width': 1, opacity: 0.5 }),
    ];
  }
  if (v === 1) {
    // Vertical bands, like a curtain.
    const n = 5;
    return Array.from({ length: n }, (_, i) =>
      s('rect', { x: (w / n) * i + 2, y: 0, width: w / n / 2, height: hgt * 0.62, fill, opacity: i % 2 ? 0.6 : 1 }),
    );
  }
  if (v === 2) {
    // Concentric arcs, a projector beam seen head on.
    return [0.42, 0.32, 0.22, 0.12].map((r) =>
      s('circle', { cx: w * 0.5, cy: hgt * 0.38, r: w * r, fill: 'none', stroke: fill, 'stroke-width': w * 0.045 }),
    );
  }
  // A field of dots, like a seat map.
  const dots: SVGElement[] = [];
  for (let r = 0; r < 6; r++) for (let c = 0; c < 6; c++) {
    if ((seed >> (r * 6 + c) % 30) & 1) dots.push(s('circle', { cx: w * (0.16 + c * 0.136), cy: hgt * (0.17 + r * 0.075), r: w * 0.035, fill }));
  }
  return dots;
}

/** Generated poster art, 2:3. */
export function artPoster(title: string, year: string | null, type: MediaType, label = true): SVGSVGElement {
  const seed = hash(title);
  const [bg, ink, fill] = PALETTES[seed % PALETTES.length]!;
  const W = 200;
  const H = 300;
  const lines = wrap(title, 13, 3);
  const size = lines.some((l) => l.length > 10) ? 26 : 30;
  const startY = H - 26 - (lines.length - 1) * size * 0.98;
  return s(
    'svg',
    { class: 'art', viewBox: `0 0 ${W} ${H}`, role: label ? 'img' : null, 'aria-label': label ? `Poster for ${title}` : null, 'aria-hidden': label ? null : 'true', preserveAspectRatio: 'xMidYMid slice' },
    s('rect', { width: W, height: H, fill: bg }),
    ...shape(seed, W, H, fill, ink),
    s('text', { x: 16, y: 26, fill: ink, class: 'art-meta' }, `${type === 'tv' ? 'SERIES' : 'FILM'}${year ? ' · ' + year : ''}`),
    ...lines.map((l, i) => s('text', { x: 15, y: startY + i * size * 0.98, fill: ink, class: 'art-title', 'font-size': size }, l)),
  );
}

/** Generated wide backdrop art, 16:9, no text. */
export function artBackdrop(title: string): SVGSVGElement {
  const seed = hash(title);
  const [bg, ink, fill] = PALETTES[seed % PALETTES.length]!;
  const W = 640;
  const H = 360;
  return s(
    'svg',
    { class: 'art', viewBox: `0 0 ${W} ${H}`, 'aria-hidden': 'true', preserveAspectRatio: 'xMidYMid slice' },
    s('rect', { width: W, height: H, fill: bg }),
    s('circle', { cx: W * (0.55 + (seed % 7) * 0.05), cy: H * 0.42, r: H * 0.34, fill }),
    s('path', { d: `M0 ${H * 0.7}H${W}M0 ${H * 0.76}H${W}`, stroke: ink, 'stroke-width': 1, opacity: 0.25 }),
  );
}

export interface PosterOpts {
  title: string;
  year: string | null;
  type: MediaType;
  path: string | null;
  /** CSS sizes attribute for srcset. */
  sizes: string;
  eager?: boolean;
  decorative?: boolean;
}

export function poster(o: PosterOpts): HTMLElement {
  if (!o.path) return h('div', { class: 'poster' }, artPoster(o.title, o.year, o.type, !o.decorative));
  return h(
    'div',
    { class: 'poster' },
    h('img', {
      src: `${IMG}w342${o.path}`,
      srcset: `${IMG}w185${o.path} 185w, ${IMG}w342${o.path} 342w, ${IMG}w780${o.path} 780w`,
      sizes: o.sizes,
      width: 342,
      height: 513,
      alt: o.decorative ? '' : `Poster for ${o.title}`,
      loading: o.eager ? 'eager' : 'lazy',
      fetchpriority: o.eager ? 'high' : null,
      decoding: 'async',
    }),
  );
}

export function backdrop(title: string, path: string | null): HTMLElement {
  if (!path) return h('div', { class: 'backdrop' }, artBackdrop(title));
  return h(
    'div',
    { class: 'backdrop' },
    h('img', {
      src: `${IMG}w780${path}`,
      srcset: `${IMG}w780${path} 780w, ${IMG}w1280${path} 1280w`,
      sizes: '100vw',
      width: 1280,
      height: 720,
      alt: '',
      loading: 'lazy',
      decoding: 'async',
    }),
  );
}

export function providerLogo(name: string, logo: string | null, live: boolean): HTMLElement {
  if (live && logo) {
    return h('img', { class: 'logo', src: `${IMG}w92${logo}`, width: 32, height: 32, alt: '', loading: 'lazy', decoding: 'async' });
  }
  const initials = name
    .replace(/\+/g, ' Plus')
    .split(/\s+/)
    .filter((w) => /^[A-Za-z0-9]/.test(w))
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join('');
  return h('span', { class: 'logo logo-initials', 'data-tone': String(hash(name) % 5), 'aria-hidden': 'true' }, initials || '?');
}
