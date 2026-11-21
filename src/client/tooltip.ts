/**
 * One shared tooltip for icon buttons. It shows on mouse hover (fine pointers
 * only) and on keyboard focus, hides on Escape, and never takes a tap: touch
 * users get the button's aria-label, which always stays the accessible name.
 */
import { h } from './dom';
import { placeTip } from '../shared/geometry';

const ID = 'tooltip';

let tip: HTMLElement | null = null;
let owner: HTMLElement | null = null;
const finePointer = () => window.matchMedia('(hover: hover) and (pointer: fine)').matches;

function el(): HTMLElement {
  if (tip?.isConnected) return tip;
  tip = h('div', { id: ID, class: 'tooltip', role: 'tooltip' });
  document.body.append(tip);
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && owner) hideTooltip();
  });
  window.addEventListener('scroll', () => hideTooltip(), { passive: true });
  window.addEventListener('resize', () => hideTooltip());
  return tip;
}

const label = (btn: HTMLElement) => btn.dataset.tip ?? btn.getAttribute('aria-label') ?? '';

function show(btn: HTMLElement): void {
  const t = el();
  if (owner && owner !== btn) owner.removeAttribute('aria-describedby');
  owner = btn;
  t.textContent = label(btn);
  btn.setAttribute('aria-describedby', ID);
  const p = placeTip(btn.getBoundingClientRect(), { width: t.offsetWidth, height: t.offsetHeight }, document.documentElement.clientWidth, window.innerHeight);
  t.style.setProperty('--tip-x', `${p.x}px`);
  t.style.setProperty('--tip-y', `${p.y}px`);
  t.classList.toggle('is-above', p.above);
  t.classList.add('is-on');
}

export function hideTooltip(btn?: HTMLElement): void {
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
    if (e.pointerType === 'mouse' && finePointer()) show(btn);
  });
  btn.addEventListener('pointerleave', () => {
    if (!btn.matches(':focus-visible')) hideTooltip(btn);
  });
  btn.addEventListener('focus', () => {
    if (btn.matches(':focus-visible')) show(btn);
  });
  btn.addEventListener('blur', () => hideTooltip(btn));
  return btn;
}
