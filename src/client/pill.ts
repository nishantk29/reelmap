/**
 * A highlight that slides between the masthead controls. It follows the
 * hovered control (fine pointers only), then the keyboard-focused one, then
 * the one whose sheet is open, and hides when none apply. It moves with
 * transform only: the new width is set at once and a FLIP scale makes it
 * grow from the old width.
 */
import { h } from './dom';
import { flipScale, pillFrame, type PillFrame } from '../shared/geometry';

export function slidingPill(nav: HTMLElement): void {
  const pill = h('span', { class: 'nav-pill', 'aria-hidden': 'true' });
  nav.prepend(pill);
  const fine = window.matchMedia('(hover: hover) and (pointer: fine)');
  let hovered: HTMLElement | null = null;
  let shown: PillFrame | null = null;

  const set = (f: PillFrame, scale: number) => {
    pill.style.setProperty('--pill-x', `${f.x}px`);
    pill.style.setProperty('--pill-w', `${f.w}px`);
    pill.style.setProperty('--pill-s', String(scale));
  };

  const target = (): HTMLElement | null => {
    if (hovered) return hovered;
    const focused = nav.querySelector<HTMLElement>('button:focus-visible');
    return focused ?? nav.querySelector<HTMLElement>('button[aria-expanded="true"]');
  };

  const update = (animate = true) => {
    const t = target();
    if (!t) {
      pill.classList.remove('is-on');
      shown = null;
      return;
    }
    const next = pillFrame(nav.getBoundingClientRect(), t.getBoundingClientRect());
    pill.classList.toggle('is-active', t.getAttribute('aria-expanded') === 'true');
    if (!shown || !animate) {
      // Appear in place: fade only, no slide from a stale spot.
      pill.classList.add('no-slide');
      set(next, 1);
    } else {
      // FLIP: draw the new frame looking like the old one, then let it settle.
      pill.classList.add('no-slide');
      set({ x: shown.x, w: next.w }, flipScale(shown, next));
      void pill.offsetWidth;
      pill.classList.remove('no-slide');
      set(next, 1);
    }
    void pill.offsetWidth;
    pill.classList.remove('no-slide');
    pill.classList.add('is-on');
    shown = next;
  };

  nav.addEventListener('pointerover', (e) => {
    const b = (e.target as Element).closest<HTMLElement>('button');
    if (e.pointerType !== 'mouse' || !fine.matches || !b || b === hovered) return;
    hovered = b;
    update();
  });
  nav.addEventListener('pointerleave', () => {
    hovered = null;
    update();
  });
  nav.addEventListener('focusin', () => update());
  nav.addEventListener('focusout', () => requestAnimationFrame(() => update()));
  window.addEventListener('resize', () => shown && update(false));
  // aria-expanded flips when a sheet opens or closes.
  new MutationObserver(() => update()).observe(nav, { subtree: true, attributes: true, attributeFilter: ['aria-expanded'] });
}
