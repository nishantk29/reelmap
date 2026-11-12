/** localStorage-backed preferences. Every read is defensive. */
import { DEFAULT_VPN, VPNS, type VpnId } from '../shared/watch';
import type { SearchItem } from '../shared/types';

const KEY = 'reelmap:v1:';
export type ThemePref = 'light' | 'dark' | 'system';

function read<T>(name: string, fallback: T, check: (v: unknown) => v is T): T {
  try {
    const raw = localStorage.getItem(KEY + name);
    if (raw == null) return fallback;
    const v: unknown = JSON.parse(raw);
    return check(v) ? v : fallback;
  } catch {
    return fallback;
  }
}

function write(name: string, value: unknown): void {
  try {
    localStorage.setItem(KEY + name, JSON.stringify(value));
  } catch {
    /* storage full or blocked: preferences just won't persist */
  }
  listeners.forEach((fn) => fn(name));
}

const listeners = new Set<(name: string) => void>();
export function onChange(fn: (name: string) => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

const isIdList = (v: unknown): v is number[] => Array.isArray(v) && v.every((x) => Number.isSafeInteger(x) && x > 0);
const isVpn = (v: unknown): v is VpnId => typeof v === 'string' && VPNS.some((x) => x.id === v);
const isTheme = (v: unknown): v is ThemePref => v === 'light' || v === 'dark' || v === 'system';
const isCc = (v: unknown): v is string => typeof v === 'string' && /^[A-Z]{2}$/.test(v);
const isRecent = (v: unknown): v is SearchItem[] =>
  Array.isArray(v) && v.every((x) => x && typeof x === 'object' && typeof (x as SearchItem).id === 'number' && typeof (x as SearchItem).title === 'string');

export const prefs = {
  myServices: (): Set<number> => new Set(read('services', [], isIdList)),
  setMyServices(ids: Iterable<number>): void {
    write('services', [...new Set(ids)].slice(0, 200));
  },
  toggleService(id: number): boolean {
    const set = prefs.myServices();
    const on = !set.has(id);
    if (on) set.add(id);
    else set.delete(id);
    prefs.setMyServices(set);
    return on;
  },
  vpn: (): VpnId => read('vpn', DEFAULT_VPN, isVpn),
  setVpn: (id: VpnId) => write('vpn', id),
  theme: (): ThemePref => read('theme', 'system', isTheme),
  setTheme: (t: ThemePref) => write('theme', t),
  region: (): string | null => read<string | null>('region', null, (v): v is string | null => v === null || isCc(v)),
  setRegion: (cc: string) => write('region', cc),
  onlyMine: (): boolean => read('onlyMine', false, (v): v is boolean => typeof v === 'boolean'),
  setOnlyMine: (b: boolean) => write('onlyMine', b),
  recent: (): SearchItem[] => read('recent', [], isRecent).slice(0, 8),
  addRecent(item: SearchItem): void {
    const list = prefs.recent().filter((x) => !(x.id === item.id && x.type === item.type));
    write('recent', [item, ...list].slice(0, 8));
  },
};
