import { describe, expect, it } from 'vitest';
import { validateId, validatePage, validateQuery, validateRegion, validateType } from '../src/shared/validate';

describe('validateQuery', () => {
  it('accepts 1..100 chars and collapses whitespace', () => {
    expect(validateQuery('  the   lantern ')).toEqual({ ok: true, value: 'the lantern' });
    expect(validateQuery('a')).toEqual({ ok: true, value: 'a' });
    expect(validateQuery('x'.repeat(100)).ok).toBe(true);
  });
  it('rejects empty, missing, too long and control characters', () => {
    expect(validateQuery('')).toEqual({ ok: false, error: 'empty_query' });
    expect(validateQuery('   ')).toEqual({ ok: false, error: 'empty_query' });
    expect(validateQuery(null)).toEqual({ ok: false, error: 'missing_query' });
    expect(validateQuery('x'.repeat(101))).toEqual({ ok: false, error: 'query_too_long' });
    expect(validateQuery('a\u0000b').ok).toBe(false);
  });
});

describe('validateId', () => {
  it('accepts positive integers only', () => {
    expect(validateId('550')).toEqual({ ok: true, value: 550 });
    for (const bad of ['0', '-1', '1.5', '01', 'abc', '', '1e3', '12345678901', null]) {
      expect(validateId(bad as string).ok, String(bad)).toBe(false);
    }
  });
});

describe('validateType', () => {
  it('accepts movie and tv only', () => {
    expect(validateType('movie').ok).toBe(true);
    expect(validateType('tv').ok).toBe(true);
    expect(validateType('person').ok).toBe(false);
    expect(validateType('TV').ok).toBe(false);
  });
});

describe('validateRegion', () => {
  it('accepts two letters and upper-cases them', () => {
    expect(validateRegion('de')).toEqual({ ok: true, value: 'DE' });
    for (const bad of ['D', 'DEU', 'D1', '', null]) expect(validateRegion(bad as string).ok).toBe(false);
  });
});

describe('validatePage', () => {
  it('defaults to 1 and caps at 20', () => {
    expect(validatePage(null)).toEqual({ ok: true, value: 1 });
    expect(validatePage('3')).toEqual({ ok: true, value: 3 });
    expect(validatePage('21').ok).toBe(false);
    expect(validatePage('0').ok).toBe(false);
  });
});
