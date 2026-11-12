import type { MediaType } from './types';

export type Valid<T> = { ok: true; value: T } | { ok: false; error: string };

const ok = <T>(value: T): Valid<T> => ({ ok: true, value });
const bad = <T>(error: string): Valid<T> => ({ ok: false, error });

/** Search text: trimmed, 1..100 characters, no control characters. */
export function validateQuery(raw: string | null | undefined): Valid<string> {
  if (raw == null) return bad('missing_query');
  const q = raw.replace(/\s+/g, ' ').trim();
  if (q.length < 1) return bad('empty_query');
  if (q.length > 100) return bad('query_too_long');
  // eslint-disable-next-line no-control-regex
  if (/[\u0000-\u001f\u007f]/.test(q)) return bad('invalid_query');
  return ok(q);
}

/** Positive integer id, written in plain decimal digits. */
export function validateId(raw: string | null | undefined): Valid<number> {
  if (raw == null || !/^[1-9]\d{0,9}$/.test(raw)) return bad('invalid_id');
  const n = Number(raw);
  if (!Number.isSafeInteger(n) || n <= 0) return bad('invalid_id');
  return ok(n);
}

export function validateType(raw: string | null | undefined): Valid<MediaType> {
  return raw === 'movie' || raw === 'tv' ? ok(raw) : bad('invalid_type');
}

/** ISO 3166-1 alpha-2 shape. Returns the code in upper case. */
export function validateRegion(raw: string | null | undefined): Valid<string> {
  if (raw == null || !/^[A-Za-z]{2}$/.test(raw)) return bad('invalid_region');
  return ok(raw.toUpperCase());
}

export function validatePage(raw: string | null | undefined): Valid<number> {
  if (raw == null || raw === '') return ok(1);
  if (!/^[1-9]\d?$/.test(raw)) return bad('invalid_page');
  const n = Number(raw);
  return n <= 20 ? ok(n) : bad('invalid_page');
}
