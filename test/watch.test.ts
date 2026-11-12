import { describe, expect, it } from 'vitest';
import {
  cliCopyText,
  cliPlan,
  DEFAULT_VPN,
  manualSteps,
  REOPEN_STEP,
  serviceLink,
  shortcutInput,
  shortcutRecipe,
  shortcutUrl,
  VPNS,
  vpnById,
} from '../src/shared/watch';

describe('shortcut URL', () => {
  it('encodes name and "<CC>|<url>" input', () => {
    const url = 'https://www.netflix.com/search?q=The%20Lantern%20Keepers&x=1';
    expect(shortcutInput('de', url)).toBe(`DE|${url}`);
    const s = shortcutUrl('de', url);
    expect(s.startsWith('shortcuts://run-shortcut?name=Reelmap%20Watch&input=text&text=')).toBe(true);
    const text = new URL(s.replace('shortcuts://', 'https://x/')).searchParams.get('text');
    expect(text).toBe(`DE|${url}`);
    expect(s).not.toContain('|');
    expect(s).not.toContain(' ');
    expect(s.split('&').length).toBe(3);
  });
});

describe('VPN data', () => {
  it('defaults to ExpressVPN', () => {
    expect(DEFAULT_VPN).toBe('expressvpn');
    expect(vpnById('nope').id).toBe('expressvpn');
    expect(vpnById(null).name).toBe('ExpressVPN');
  });
});

describe('CLI commands', () => {
  it('ExpressVPN lists regions, then connects by exact location name', () => {
    const p = cliPlan('expressvpn', 'de', 'Germany')!;
    expect(p.os).toBe('Linux');
    expect(p.lines).toEqual([
      'expressvpnctl background enable',
      'expressvpnctl get regions | grep -i "Germany"',
      'expressvpnctl connect "<a Germany location from the list>"',
    ]);
  });
  it('NordVPN uses uk for GB and underscores in names', () => {
    const p = cliPlan('nordvpn', 'GB', 'United Kingdom')!;
    expect(p.lines).toEqual(['nordvpn countries', 'nordvpn cities united_kingdom', 'nordvpn connect uk<server number>']);
  });
  it('Proton VPN connects by country code', () => {
    expect(cliPlan('protonvpn', 'jp', 'Japan')!.lines).toEqual(['protonvpn connect --country JP']);
  });
  it('Mullvad sets a lowercase location then connects', () => {
    const p = cliPlan('mullvad', 'SE', 'Sweden')!;
    expect(cliCopyText(p)).toBe('mullvad relay set location se\nmullvad connect');
    expect(p.os).toContain('Windows');
  });
  it('returns null where no scriptable official CLI exists', () => {
    expect(cliPlan('surfshark', 'DE', 'Germany')).toBeNull();
    expect(cliPlan('norton', 'DE', 'Germany')).toBeNull();
    expect(cliPlan('other', 'DE', 'Germany')).toBeNull();
  });
  it('strips shell metacharacters from names', () => {
    const p = cliPlan('expressvpn', 'XX', 'Bad"$(rm)`')!;
    expect(p.lines.join('\n')).not.toMatch(/[$`]/);
  });
});

describe('manual steps', () => {
  it('always include the reopen step, for every VPN', () => {
    for (const v of VPNS) {
      const steps = manualSteps(v.id, 'France', 'Netflix');
      expect(steps).toContain(REOPEN_STEP);
      expect(steps[0]).toContain('France');
    }
    expect(manualSteps('other', 'France', 'Netflix')[0]).toContain('your VPN app');
  });
});

describe('shortcut recipe', () => {
  it('uses the vendor location action when documented (Proton VPN)', () => {
    const steps = shortcutRecipe('protonvpn');
    expect(steps.some((s) => s.action.includes('Connect to region'))).toBe(true);
    expect(steps.at(-1)!.action).toBe('Open URLs');
  });
  it('falls back to Set VPN per country for ExpressVPN and says why', () => {
    const steps = shortcutRecipe('expressvpn');
    const text = steps.map((s) => s.detail).join(' ');
    expect(text).toContain('Set VPN');
    expect(text).toContain('not one that takes a location');
    expect(steps[0]!.detail).toContain('Reelmap Watch');
  });
});

describe('service links', () => {
  it('builds a search link for known services', () => {
    const l = serviceLink(8, 'Netflix', 'Paper Moons & Co', null);
    expect(l.kind).toBe('search');
    expect(l.url).toBe('https://www.netflix.com/search?q=Paper%20Moons%20%26%20Co');
    expect(l.label).toBe('Opens Netflix search for this title');
  });
  it('falls back to the TMDB watch link, then to none', () => {
    const tmdb = 'https://www.themoviedb.org/movie/1/watch?locale=DE';
    expect(serviceLink(99999, 'Unknown+', 'X', tmdb)).toMatchObject({ kind: 'tmdb', url: tmdb });
    expect(serviceLink(99999, 'Unknown+', 'X', null)).toMatchObject({ kind: 'none', url: '' });
  });
});
