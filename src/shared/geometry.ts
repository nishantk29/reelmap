/** Pure layout maths for the masthead pill and the shared tooltip (kept DOM-free so it is unit tested). */

export interface Box {
  left: number;
  top: number;
  width: number;
  height: number;
}

const GAP = 8;
const EDGE = 8;

/** Centre a tooltip under its anchor, flip above if it would leave the viewport, clamp to the edges. */
export function placeTip(anchor: Box, tip: { width: number; height: number }, vw: number, vh: number): { x: number; y: number; above: boolean } {
  const centre = anchor.left + anchor.width / 2;
  const x = Math.round(Math.min(Math.max(centre - tip.width / 2, EDGE), Math.max(EDGE, vw - EDGE - tip.width)));
  const below = anchor.top + anchor.height + GAP;
  const above = below + tip.height > vh - EDGE && anchor.top - GAP - tip.height >= EDGE;
  return { x, y: Math.round(above ? anchor.top - GAP - tip.height : below), above };
}

export interface PillFrame {
  x: number;
  w: number;
}

/** Where the pill sits for a target, relative to its nav. */
export function pillFrame(nav: { left: number }, target: { left: number; width: number }): PillFrame {
  return { x: Math.round(target.left - nav.left), w: Math.round(target.width) };
}

/** Mouse hover waits this long before the tooltip shows; keyboard focus shows it at once. */
export const TIP_DELAY_MS = 400;

/**
 * A tooltip only describes its button when it says something the name does not
 * (for example "Copied"); otherwise screen readers would hear the name twice.
 */
export function tipDescribes(text: string, name: string | null): boolean {
  const norm = (s: string) => s.replace(/\s+/g, ' ').trim().toLowerCase();
  return norm(text) !== '' && norm(text) !== norm(name ?? '');
}

/** The scaleX that makes a pill of the next width look like the previous frame (FLIP invert). */
export function flipScale(prev: PillFrame | null, next: PillFrame): number {
  return prev && prev.w > 0 && next.w > 0 ? prev.w / next.w : 1;
}
