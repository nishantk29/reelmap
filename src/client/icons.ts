/** One small icon set: 24px grid, 1.5 stroke, round caps. */
import { s } from './dom';

const PATHS: Record<string, string[]> = {
  search: ['M10.5 17a6.5 6.5 0 1 0 0-13 6.5 6.5 0 0 0 0 13z', 'M15.5 15.5 20 20'],
  sun: ['M12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8z', 'M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4'],
  moon: ['M19.5 14.2A7.5 7.5 0 0 1 9.8 4.5a7.5 7.5 0 1 0 9.7 9.7z'],
  sliders: ['M4 7h9M17 7h3M4 17h3M11 17h9', 'M15 9a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM9 19a2 2 0 1 0 0-4 2 2 0 0 0 0 4z'],
  close: ['M6 6l12 12M18 6 6 18'],
  check: ['M5 12.5l4.5 4.5L19 7'],
  back: ['M19 12H5M11 6l-6 6 6 6'],
  chevron: ['M9 6l6 6-6 6'],
  copy: ['M9 9h10v10H9z', 'M15 9V5H5v10h4'],
  external: ['M14 4h6v6M20 4l-9 9', 'M18 14v5H5V6h5'],
  globe: ['M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z', 'M3 12h18M12 3c2.5 2.6 3.8 5.6 3.8 9s-1.3 6.4-3.8 9c-2.5-2.6-3.8-5.6-3.8-9S9.5 5.6 12 3z'],
  terminal: ['M3.5 5h17v14h-17z', 'M7 9.5l3 2.5-3 2.5M12.5 15H17'],
  phone: ['M7.5 3h9v18h-9z', 'M11 18h2'],
  play: ['M8 5.5v13l10.5-6.5z'],
  list: ['M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01'],
  info: ['M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z', 'M12 11v5.5M12 7.5v.01'],
  filter: ['M4 5h16l-6 7.5V19l-4-2v-4.5z'],
};

export type IconName = keyof typeof PATHS;

export function icon(name: IconName, cls = 'icon'): SVGSVGElement {
  return s(
    'svg',
    { class: cls, viewBox: '0 0 24 24', width: 20, height: 20, 'aria-hidden': 'true', focusable: 'false' },
    ...(PATHS[name] ?? []).map((d) => s('path', { d })),
  );
}

/** The Reelmap mark: a ticket stub with a perforation and a location dot. */
export function mark(cls = 'mark'): SVGSVGElement {
  return s(
    'svg',
    { class: cls, viewBox: '0 0 32 32', width: 28, height: 28, 'aria-hidden': 'true', focusable: 'false' },
    s('path', {
      class: 'mark-stub',
      d: 'M5 7h22v6a3 3 0 0 0 0 6v6H5v-6a3 3 0 0 0 0-6z',
    }),
    s('path', { class: 'mark-perf', d: 'M20 9.5v2M20 14.5v2M20 19.5v2' }),
    s('circle', { class: 'mark-dot', cx: 12.5, cy: 16, r: 2.6 }),
  );
}
