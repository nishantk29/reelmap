import { h } from './dom';
import { openSheet } from './sheet';
import { prefs, type ThemePref } from './store';
import { VPNS, type VpnInfo } from '../shared/watch';

function capability(v: VpnInfo): string {
  if (v.id === 'other') return 'Manual steps, or Apple Set VPN with your own profiles.';
  const sc = v.shortcuts.action ? (v.shortcuts.takesLocation ? 'Shortcuts can pick a country' : 'Shortcuts connect only') : 'No documented Shortcuts action';
  const cli = v.cliOs ? `Command line on ${v.cliOs}` : 'No scriptable command line';
  return `${sc}. ${cli}.`;
}

export function openSettingsSheet(applyTheme: (t: ThemePref) => void): void {
  openSheet(
    'My VPN and display',
    (body) => {
      const current = prefs.vpn();
      body.append(
        h(
          'fieldset',
          { class: 'radio-group', 'data-testid': 'vpn-options' },
          h('legend', { class: 'sheet-h' }, 'My VPN'),
          h('p', { class: 'small' }, 'Watch it tailors its steps to this VPN. Based on each vendor\'s own help pages.'),
          VPNS.map((v) => {
            const r = h('input', { type: 'radio', name: 'vpn', value: v.id, class: 'radio', checked: v.id === current });
            r.addEventListener('change', () => prefs.setVpn(v.id));
            return h('label', { class: 'pick pick-radio' }, r, h('span', { class: 'pick-text' }, h('span', null, v.name), h('span', { class: 'small' }, capability(v))));
          }),
        ),
        h(
          'fieldset',
          { class: 'radio-group' },
          h('legend', { class: 'sheet-h' }, 'Theme'),
          h(
            'div',
            { class: 'segmented' },
            (['system', 'light', 'dark'] as ThemePref[]).map((t) => {
              const r = h('input', { type: 'radio', name: 'theme', value: t, class: 'radio', checked: prefs.theme() === t });
              r.addEventListener('change', () => {
                prefs.setTheme(t);
                applyTheme(t);
              });
              return h('label', { class: 'seg' }, r, h('span', null, t === 'system' ? 'Match system' : t === 'light' ? 'Light' : 'Dark'));
            }),
          ),
        ),
      );
    },
    { testid: 'settings-sheet' },
  );
}
