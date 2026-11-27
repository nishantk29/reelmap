import { h } from './dom';
import { openSheet, type Sheet } from './sheet';
import { prefs } from './store';
import { VPNS, type VpnInfo } from '../shared/watch';

function capability(v: VpnInfo): string {
  if (v.id === 'other') return 'Manual steps, or Apple Set VPN with your own profiles.';
  const sc = v.shortcuts.action ? (v.shortcuts.takesLocation ? 'Shortcuts can pick a country' : 'Shortcuts connect only') : 'No documented Shortcuts action';
  const cli = v.cliOs ? `Command line on ${v.cliOs}` : 'No scriptable command line';
  return `${sc}. ${cli}.`;
}

export function openSettingsSheet(): Sheet {
  return openSheet(
    'My VPN',
    (body) => {
      const current = prefs.vpn();
      body.append(
        h(
          'fieldset',
          { class: 'radio-group', 'data-testid': 'vpn-options' },
          h('legend', { class: 'sr-only' }, 'My VPN'),
          h('p', { class: 'small' }, 'Watch it tailors its steps to this VPN. Based on each vendor\'s own help pages.'),
          VPNS.map((v) => {
            const r = h('input', { type: 'radio', name: 'vpn', value: v.id, class: 'radio', checked: v.id === current });
            r.addEventListener('change', () => prefs.setVpn(v.id));
            return h('label', { class: 'pick pick-radio' }, r, h('span', { class: 'pick-text' }, h('span', null, v.name), h('span', { class: 'small' }, capability(v))));
          }),
        ),
      );
    },
    { testid: 'settings-sheet' },
  );
}
