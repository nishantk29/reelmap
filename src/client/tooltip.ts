/**
 * One shared tooltip for icon buttons. It shows on mouse hover (fine pointers
 * only, after a short delay) and at once on keyboard focus, and never takes a
 * tap: touch users get the button's aria-label, which always stays the
 * accessible name. The first Escape hides only the tooltip; the next one
 * reaches whatever is behind it (a sheet, the search).
 */
import { h } from './dom';
import { placeTip, tipDescribes, TIP_DELAY_MS } from '../shared/geometry';

const ID = 'tooltip';

let tip: HTMLElement | null = null;
let owner: HTMLElement | null = null;
let timer = 0;
const finePointer = () => window.matchMedia('(hover: hover) and (pointer: fine)').matches;

function el(): HTMLElement {
  if (tip?.isConnected) return tip;
  tip = h('div', { id: ID, class: 'tooltip', role: 'tooltip', 'aria-hidden': 'true' });
  document.body.append(tip);
  // Capture phase, so this runs before a dialog or the search sees the key.
  window.addEventListener(
    'keydown',
    (e) => {
      if (e.key !== 'Escape' || !owner) return;
      e.preventDefault();
      e.stopPropagation();
      hideTooltip();
    },
    true,
  );
  window.addEventListener('scroll', () => hideTooltip(), { passive: true });
  window.addEventListener('resize', () => hideTooltip());
  return tip;
}

const label = (btn: HTMLElement) => btn.dataset.tip ?? btn.getAttribute('aria-label') ?? '';

function show(btn: HTMLElement): void {
  clearTimeout(timer);
  const t = el();
  if (owner && owner !== btn) owner.removeAttribute('aria-describedby');
  owner = btn;
  const text = label(btn);
  t.textContent = text;
  // Describe the button only when the tip adds something; otherwise the name would be read twice.
  const describes = tipDescribes(text, btn.getAttribute('aria-label'));
  if (describes) btn.setAttribute('aria-describedby', ID);
  else btn.removeAttribute('aria-describedby');
  t.setAttribute('aria-hidden', String(!describes));
  const p = placeTip(btn.getBoundingClientRect(), { width: t.offsetWidth, height: t.offsetHeight }, document.documentElement.clientWidth, window.innerHeight);
  t.style.setProperty('--tip-x', `${p.x}px`);
  t.style.setProperty('--tip-y', `${p.y}px`);
  t.classList.toggle('is-above', p.above);
  t.classList.add('is-on');
}

export function hideTooltip(btn?: HTMLElement): void {
  if (!btn || !owner || btn === owner) clearTimeout(timer);
  if (!owner || (btn && btn !== owner)) return;
  owner.removeAttribute('aria-describedby');
  owner = null;
  tip?.classList.remove('is-on');
}

/** Change the tip text (for example "Copied"); pass null to go back to the aria-label. */
export function setTip(btn: HTMLElement, text: string | null): void {
  if (text == null) delete btn.dataset.tip;
  else btn.dataset.tip = text;
  if (owner === btn) show(btn);
}

/** Give an icon button the shared tooltip. Its text is the aria-label unless setTip overrides it. */
export function withTooltip<T extends HTMLElement>(btn: T): T {
  btn.addEventListener('pointerenter', (e) => {
    if (e.pointerType !== 'mouse' || !finePointer() || owner === btn) return;
    clearTimeout(timer);
    timer = window.setTimeout(() => show(btn), TIP_DELAY_MS);
  });
  btn.addEventListener('pointerleave', () => {
    clearTimeout(timer);
    if (!btn.matches(':focus-visible')) hideTooltip(btn);
  });
  btn.addEventListener('focus', () => {
    if (btn.matches(':focus-visible')) show(btn);
  });
  btn.addEventListener('blur', () => hideTooltip(btn));
  return btn;
}
