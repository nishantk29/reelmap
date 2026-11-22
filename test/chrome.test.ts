import { describe, expect, it } from 'vitest';
import { flipScale, pillFrame, placeTip, tipDescribes, TIP_DELAY_MS } from '../src/shared/geometry';

describe('placeTip', () => {
  const tip = { width: 80, height: 26 };

  it('centres the tip below the anchor', () => {
    expect(placeTip({ left: 100, top: 10, width: 44, height: 44 }, tip, 390, 844)).toEqual({ x: 82, y: 62, above: false });
  });

  it('keeps the tip inside the left and right edges', () => {
    expect(placeTip({ left: 0, top: 10, width: 44, height: 44 }, tip, 390, 844).x).toBe(8);
    expect(placeTip({ left: 346, top: 10, width: 44, height: 44 }, tip, 390, 844).x).toBe(390 - 8 - 80);
  });

  it('flips above when there is no room below', () => {
    expect(placeTip({ left: 100, top: 800, width: 44, height: 44 }, tip, 390, 844)).toEqual({ x: 82, y: 800 - 8 - 26, above: true });
  });

  it('stays below when there is no room above either', () => {
    expect(placeTip({ left: 100, top: 10, width: 44, height: 44 }, tip, 390, 60).above).toBe(false);
  });
});

describe('sliding pill', () => {
  it('measures the target relative to the nav', () => {
    expect(pillFrame({ left: 200 }, { left: 248.4, width: 131.6 })).toEqual({ x: 48, w: 132 });
  });

  it('inverts the width change with a scale, and is 1 when appearing', () => {
    expect(flipScale({ x: 0, w: 132 }, { x: 140, w: 44 })).toBe(3);
    expect(flipScale(null, { x: 0, w: 44 })).toBe(1);
    expect(flipScale({ x: 0, w: 0 }, { x: 0, w: 44 })).toBe(1);
  });
});

describe('tipDescribes', () => {
  it('does not describe a button whose tip repeats its name', () => {
    expect(tipDescribes('Copy link', 'Copy link')).toBe(false);
    expect(tipDescribes(' copy  link ', 'Copy link')).toBe(false);
    expect(tipDescribes('', null)).toBe(false);
  });

  it('describes a button when the tip says something new', () => {
    expect(tipDescribes('Copied', 'Copy link')).toBe(true);
    expect(tipDescribes('Copy is blocked here', 'Copy link')).toBe(true);
  });

  it('waits 400ms on mouse hover', () => {
    expect(TIP_DELAY_MS).toBe(400);
  });
});
