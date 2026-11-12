/** Country names and flags. Flags use regional-indicator characters, for flags only. */
import type { Region } from '../shared/types';

let display: Intl.DisplayNames | null = null;
try {
  display = new Intl.DisplayNames(['en'], { type: 'region' });
} catch {
  display = null;
}

const known = new Map<string, string>();
const SHORT: Record<string, string> = { US: 'United States', GB: 'United Kingdom', KR: 'South Korea', CZ: 'Czechia' };

export function learnRegions(regions: Region[]): void {
  for (const r of regions) if (!known.has(r.cc)) known.set(r.cc, r.name);
}

export function countryName(cc: string): string {
  const code = cc.toUpperCase();
  if (SHORT[code]) return SHORT[code]!;
  try {
    const n = display?.of(code);
    if (n && n !== code) return n;
  } catch {
    /* fall through */
  }
  return known.get(code) ?? code;
}

export function flag(cc: string): string {
  const code = cc.toUpperCase();
  if (!/^[A-Z]{2}$/.test(code)) return '';
  return String.fromCodePoint(...[...code].map((c) => 0x1f1e6 + c.charCodeAt(0) - 65));
}
