import { getMode } from './api';
import { countryName, flag } from './countries';
import { clear, h } from './dom';
import { icon } from './icons';
import { providerLogo } from './poster';
import { openSheet, section } from './sheet';
import { prefs } from './store';
import {
  cliCopyText,
  cliPlan,
  manualSteps,
  serviceLink,
  shortcutInput,
  shortcutRecipe,
  shortcutUrl,
  SHORTCUT_NAME,
  SYSTEM_VPN_STEPS,
  VPNS,
  vpnById,
  type VpnId,
} from '../shared/watch';
import { OFFER_LABELS, OFFER_TYPES, type TitleDetail } from '../shared/types';

export interface WatchTarget {
  detail: TitleDetail;
  providerId: number;
  cc: string;
}

const APPLE_URL_DOC = 'https://support.apple.com/guide/shortcuts/run-a-shortcut-from-a-url-apd624386f42/ios';
const isApple = () => /iPhone|iPad|Macintosh|Mac OS X/.test(navigator.userAgent);

export function openWatchSheet(t: WatchTarget): void {
  const { detail: d } = t;
  const provider = d.providers[t.providerId];
  if (!provider) return;
  const regions = d.regions
    .filter((r) => OFFER_TYPES.some((ty) => r.offers[ty]?.includes(provider.id)))
    .sort((a, b) => countryName(a.cc).localeCompare(countryName(b.cc)));
  const state = { cc: regions.some((r) => r.cc === t.cc) ? t.cc : regions[0]?.cc ?? t.cc, vpn: prefs.vpn() };

  openSheet(
    `Watch on ${provider.name}`,
    (body) => {
      const countrySel = h(
        'select',
        { id: 'watch-country', class: 'select', 'data-testid': 'watch-country' },
        regions.map((r) => h('option', { value: r.cc }, `${flag(r.cc)} ${countryName(r.cc)}`)),
      );
      const vpnSel = h(
        'select',
        { id: 'watch-vpn', class: 'select', 'data-testid': 'watch-vpn' },
        VPNS.map((v) => h('option', { value: v.id }, v.name)),
      );
      countrySel.value = state.cc;
      vpnSel.value = state.vpn;
      const content = h('div', { class: 'watch-content' });

      countrySel.addEventListener('change', () => {
        state.cc = countrySel.value;
        render();
      });
      vpnSel.addEventListener('change', () => {
        state.vpn = vpnSel.value as VpnId;
        prefs.setVpn(state.vpn);
        render();
      });

      body.append(
        h(
          'div',
          { class: 'watch-intro' },
          providerLogo(provider.name, provider.logo, getMode() === 'live'),
          h('p', null, h('strong', null, d.title), d.year ? ` (${d.year})` : ''),
        ),
        h(
          'div',
          { class: 'field-row' },
          h('label', { class: 'field' }, h('span', { class: 'field-label' }, 'Country'), countrySel),
          h('label', { class: 'field' }, h('span', { class: 'field-label' }, 'My VPN'), vpnSel),
        ),
        h(
          'p',
          { class: 'notice' },
          icon('info'),
          h('span', null, 'A website cannot change your VPN. Reelmap can run a shortcut you set up once, or show the command to run. You stay in control.'),
        ),
        content,
      );

      const render = () => {
        const cc = state.cc;
        const name = countryName(cc);
        const vpn = vpnById(state.vpn);
        const region = d.regions.find((r) => r.cc === cc);
        const types = OFFER_TYPES.filter((ty) => region?.offers[ty]?.includes(provider.id)).map((ty) => OFFER_LABELS[ty].toLowerCase());
        const link = serviceLink(provider.id, provider.name, d.title, region?.link ?? null);
        const target = link.url || region?.link || `https://www.themoviedb.org/${d.type}/${d.id}`;
        const input = shortcutInput(cc, target);
        const plan = cliPlan(vpn.id, cc, name);
        const copyStatus = h('span', { class: 'copy-status', role: 'status' });

        const shortcutSection = section(
          'iPhone, iPad or Mac',
          h(
            'a',
            { class: 'btn btn-accent', href: shortcutUrl(cc, target), 'data-testid': 'run-shortcut' },
            icon('phone'),
            `Run ${SHORTCUT_NAME}`,
          ),
          h('p', { class: 'small' }, `Runs your "${SHORTCUT_NAME}" shortcut with this input:`),
          h('pre', { class: 'code', 'data-testid': 'shortcut-input' }, h('code', null, input)),
          vpn.shortcuts.takesLocation
            ? h('p', { class: 'small' }, `${vpn.name} documents a "${vpn.shortcuts.action}" action that takes a country, so the shortcut can switch for you.`)
            : h(
                'p',
                { class: 'small' },
                vpn.shortcuts.action
                  ? `${vpn.name} documents Shortcuts actions that connect, but not ones that pick a country. The recipe uses Apple's Set VPN for countries you set up, and otherwise asks you to pick ${name} in the app.`
                  : `${vpn.name === 'Another VPN' ? 'Your VPN' : vpn.name} does not document a Shortcuts action that picks a country. The recipe uses Apple's Set VPN, or asks you to pick ${name} in the app.`,
              ),
          h(
            'details',
            { class: 'recipe' },
            h('summary', null, 'Set up the shortcut once'),
            h(
              'ol',
              { class: 'numbered' },
              shortcutRecipe(vpn.id).map((s) => h('li', null, h('strong', null, s.action), h('span', null, s.detail))),
            ),
            h(
              'p',
              { class: 'small' },
              'There is no file to download. Apple only signs shortcut files on a Mac, so you build this one yourself. It takes about five minutes. ',
              h('a', { href: APPLE_URL_DOC, rel: 'noopener', target: '_blank' }, 'How Apple runs shortcuts from a link'),
              '.',
            ),
          ),
        );

        const cliSection = section(
          'Computer',
          plan
            ? [
                h('p', { class: 'small' }, `${vpn.name} command line, ${plan.os}. Run these in a terminal:`),
                h('pre', { class: 'code', 'data-testid': 'cli-command' }, h('code', null, plan.lines.join('\n'))),
                h(
                  'div',
                  { class: 'copy-row' },
                  h(
                    'button',
                    {
                      class: 'btn btn-outline btn-sm',
                      type: 'button',
                      'data-testid': 'copy-cli',
                      onclick: async () => {
                        try {
                          await navigator.clipboard.writeText(cliCopyText(plan));
                          copyStatus.textContent = 'Copied';
                        } catch {
                          copyStatus.textContent = 'Copy is blocked here. Select the text and copy it.';
                        }
                      },
                    },
                    icon('copy'),
                    'Copy commands',
                  ),
                  copyStatus,
                ),
                plan.notes.map((n) => h('p', { class: 'small' }, n)),
                h('p', { class: 'small' }, h('a', { href: plan.source, rel: 'noopener', target: '_blank' }, `${vpn.name} command line help`, icon('external', 'icon icon-inline'))),
              ]
            : h(
                'p',
                { class: 'small', 'data-testid': 'cli-none' },
                vpn.id === 'other'
                  ? 'Check whether your VPN has an official command line. If not, use the steps below.'
                  : `${vpn.name} does not document a command line that picks a country. Use the steps below.`,
              ),
        );

        const stepsSection = section(
          'Step by step',
          h('ol', { class: 'numbered', 'data-testid': 'manual-steps' }, manualSteps(vpn.id, name, provider.name).map((s) => h('li', null, s))),
          vpn.id === 'other' || !vpn.shortcuts.takesLocation
            ? h('details', { class: 'recipe' }, h('summary', null, 'Use system VPN profiles instead'), h('ol', { class: 'numbered' }, SYSTEM_VPN_STEPS.map((s) => h('li', null, s))))
            : null,
        );

        const openSection = section(
          `Open ${provider.name}`,
          link.url
            ? h('a', { class: 'btn btn-outline', href: link.url, rel: 'noopener', target: '_blank', 'data-testid': 'open-service' }, icon('external'), `Open ${provider.name}`)
            : null,
          h('p', { class: 'small' }, link.label, types.length ? `. In ${name}: ${types.join(', ')}.` : '.'),
          region?.link
            ? h('p', { class: 'small' }, h('a', { href: region.link, rel: 'noopener', target: '_blank', 'data-testid': 'more-options' }, 'More options'))
            : null,
        );

        clear(content, ...(isApple() ? [shortcutSection, cliSection] : [cliSection, shortcutSection]), stepsSection, openSection);
      };
      render();
    },
    { wide: true, testid: 'watch-sheet' },
  );
}
