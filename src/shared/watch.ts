/**
 * "Watch it" builders. Everything here is a pure string builder so it can be
 * unit tested. Sources for every VPN fact are in docs/vpn-support.md
 * (checked 2026-11-12).
 */

export type VpnId = 'expressvpn' | 'nordvpn' | 'protonvpn' | 'norton' | 'surfshark' | 'mullvad' | 'other';

export interface VpnInfo {
  id: VpnId;
  name: string;
  /** Vendor Shortcuts action, as documented. */
  shortcuts: { action: string | null; takesLocation: boolean; platforms: string };
  /** Where the official CLI runs, or null when there is none to script. */
  cliOs: string | null;
  source: string;
}

export const VPNS: readonly VpnInfo[] = [
  {
    id: 'expressvpn',
    name: 'ExpressVPN',
    shortcuts: { action: 'Connect (ExpressVPN)', takesLocation: false, platforms: 'iPhone and iPad' },
    cliOs: 'Linux',
    source: 'https://www.expressvpn.com/support/vpn-setup/app-for-linux-cli/',
  },
  {
    id: 'nordvpn',
    name: 'NordVPN',
    shortcuts: { action: 'Secure my connection', takesLocation: false, platforms: 'iPhone and iPad' },
    cliOs: 'Linux',
    source: 'https://support.nordvpn.com/hc/en-us/articles/20196094470929-Installing-NordVPN-on-Linux-distributions',
  },
  {
    id: 'protonvpn',
    name: 'Proton VPN',
    shortcuts: { action: 'Connect to region', takesLocation: true, platforms: 'iPhone and iPad (paid plan)' },
    cliOs: 'Linux',
    source: 'https://protonvpn.com/support/ios-shortcuts',
  },
  {
    id: 'surfshark',
    name: 'Surfshark',
    shortcuts: { action: null, takesLocation: false, platforms: 'iPhone and iPad' },
    cliOs: null,
    source: 'https://support.surfshark.com/hc/en-us/articles/360017418334',
  },
  {
    id: 'norton',
    name: 'Norton VPN',
    shortcuts: { action: null, takesLocation: false, platforms: '' },
    cliOs: null,
    source: 'https://support.norton.com/',
  },
  {
    id: 'mullvad',
    name: 'Mullvad',
    shortcuts: { action: null, takesLocation: false, platforms: '' },
    cliOs: 'Linux, macOS and Windows',
    source: 'https://mullvad.net/en/help/how-use-mullvad-cli',
  },
  {
    id: 'other',
    name: 'Another VPN',
    shortcuts: { action: null, takesLocation: false, platforms: '' },
    cliOs: null,
    source: 'https://support.apple.com/en-us/101583',
  },
];

export const DEFAULT_VPN: VpnId = 'expressvpn';
export const SHORTCUT_NAME = 'Reelmap Watch';
export const REOPEN_STEP = 'Fully close and reopen the streaming app so it re-detects your region.';

export function vpnById(id: string | null | undefined): VpnInfo {
  return VPNS.find((v) => v.id === id) ?? VPNS.find((v) => v.id === DEFAULT_VPN)!;
}

/* ---------------- Shortcuts ---------------- */

/** The text handed to the shortcut: "<CC>|<url>". */
export function shortcutInput(cc: string, url: string): string {
  return `${cc.toUpperCase()}|${url}`;
}

/**
 * Apple documents shortcuts://run-shortcut?name=…&input=text&text=…
 * https://support.apple.com/guide/shortcuts/run-a-shortcut-from-a-url-apd624386f42/ios
 */
export function shortcutUrl(cc: string, url: string, name: string = SHORTCUT_NAME): string {
  return (
    'shortcuts://run-shortcut?name=' +
    encodeURIComponent(name) +
    '&input=text&text=' +
    encodeURIComponent(shortcutInput(cc, url))
  );
}

export interface RecipeStep {
  action: string;
  detail: string;
}

/** Steps to build the one reusable "Reelmap Watch" shortcut for a VPN. */
export function shortcutRecipe(vpnId: VpnId): RecipeStep[] {
  const vpn = vpnById(vpnId);
  const steps: RecipeStep[] = [
    { action: 'Create a shortcut', detail: `Open Shortcuts, tap +, and name it "${SHORTCUT_NAME}" exactly.` },
    { action: 'Receive input', detail: 'Turn on "Receive text from Share Sheet", or use Shortcut Input. Reelmap sends text like "DE|https://…".' },
    { action: 'Split Text', detail: 'Split Shortcut Input by Custom "|".' },
    { action: 'Get Item from List', detail: 'Get the First Item. Rename it Country.' },
    { action: 'Get Item from List', detail: 'Get the Last Item from Split Text. Rename it Link.' },
  ];
  if (vpn.shortcuts.takesLocation && vpn.shortcuts.action) {
    steps.push({
      action: `${vpn.name}: ${vpn.shortcuts.action}`,
      detail: `Add the ${vpn.name} action "${vpn.shortcuts.action}" and set its country to the Country variable. ${vpn.name} documents this action for ${vpn.shortcuts.platforms}.`,
    });
  } else {
    steps.push({
      action: 'Choose by country',
      detail:
        'Add "If" (Country is "DE") for each country you use, or "Choose from Menu". Inside each branch add "Set VPN", pick the VPN configuration you installed for that country, and set it to Connect.',
    });
    steps.push({
      action: 'Otherwise',
      detail: vpn.shortcuts.action
        ? `In the Otherwise branch, add "Show Notification" (Pick Country in ${vpn.name}), then "Open App" ${vpn.name}, then "Wait to Return". ${vpn.name} documents a "${vpn.shortcuts.action}" action, but not one that takes a location.`
        : `In the Otherwise branch, add "Show Notification" (Pick Country in your VPN), then "Open App" for your VPN, then "Wait to Return". ${vpn.id === 'other' ? 'Your VPN' : vpn.name} does not document a Shortcuts action that takes a location.`,
    });
  }
  steps.push({ action: 'Wait', detail: 'Add "Wait" for 3 seconds so the tunnel can come up.' });
  steps.push({ action: 'Open URLs', detail: 'Open the Link variable. This opens the streaming service in its app or browser.' });
  return steps;
}

/* ---------------- Desktop CLI ---------------- */

export interface CliPlan {
  os: string;
  /** Commands to run in order. Placeholders are written as <like this>. */
  lines: string[];
  notes: string[];
  source: string;
}

/** NordVPN uses "uk" for the United Kingdom in its server names (e.g. uk715). */
const nordCode = (cc: string) => (cc.toUpperCase() === 'GB' ? 'uk' : cc.toLowerCase());
/** NordVPN city and country arguments use lower case with underscores. */
const nordName = (name: string) => name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');

export function cliPlan(vpnId: VpnId, cc: string, countryName: string): CliPlan | null {
  const vpn = vpnById(vpnId);
  const code = cc.toUpperCase();
  switch (vpn.id) {
    case 'expressvpn':
      return {
        os: 'Linux',
        lines: [
          'expressvpnctl background enable',
          'expressvpnctl get regions',
          `expressvpnctl connect "<a ${countryName.replace(/["\\$`]/g, '')} location from the list>"`,
        ],
        notes: [
          'ExpressVPN documents connecting by exact location name, such as "Germany - Frankfurt - 1". It does not document connecting by country alone, so pick a location from the list. Location names can be short forms, such as UK or USA.',
          'The first line is only needed when the ExpressVPN app is not running.',
        ],
        source: vpn.source,
      };
    case 'nordvpn':
      return {
        os: 'Linux',
        lines: ['nordvpn countries', `nordvpn cities ${nordName(countryName)}`, `nordvpn connect ${nordCode(code)}<server number>`],
        notes: [
          `NordVPN documents connecting to a specific server as country code plus server number, for example "nordvpn connect uk715". Find a ${countryName} server number in the NordVPN app.`,
        ],
        source: vpn.source,
      };
    case 'protonvpn':
      return {
        os: 'Linux',
        lines: [`protonvpn connect --country ${code}`],
        notes: ['The Proton VPN CLI cannot run while the Proton VPN desktop app is open.'],
        source: 'https://protonvpn.com/support/use-linux-cli',
      };
    case 'mullvad':
      return {
        os: 'Linux, macOS and Windows',
        lines: [`mullvad relay set location ${code.toLowerCase()}`, 'mullvad connect'],
        notes: [],
        source: vpn.source,
      };
    default:
      return null;
  }
}

/** Joins plan lines for the copy button. Placeholder lines are left as-is. */
export function cliCopyText(plan: CliPlan): string {
  return plan.lines.join('\n');
}

/* ---------------- Manual steps (always available) ---------------- */

export function manualSteps(vpnId: VpnId, countryName: string, serviceName: string): string[] {
  const vpn = vpnById(vpnId);
  const app = vpn.id === 'other' ? 'your VPN app' : `the ${vpn.name} app`;
  return [
    `Open ${app} and connect to a server in ${countryName}.`,
    `Check that it says you are connected to ${countryName}.`,
    REOPEN_STEP,
    `Open ${serviceName} and search for the title.`,
  ];
}

export const SYSTEM_VPN_STEPS: string[] = [
  'If your VPN offers WireGuard or IKEv2 configuration files, download one per country you use.',
  'Import them into the WireGuard app or install the profile, so they appear in Settings, VPN.',
  'In your Reelmap Watch shortcut, use "Set VPN" to connect the configuration that matches the country.',
];

/* ---------------- Streaming service links ---------------- */

export interface ServiceLink {
  url: string;
  /** Honest description of what the link opens. */
  label: string;
  kind: 'search' | 'tmdb' | 'none';
}

type Builder = (q: string) => string;

/**
 * Public search pages, keyed by TMDB provider id. TMDB does not give
 * per-service title ids, so these open the service's own search for the
 * title, which the service app takes over where it supports universal links.
 */
export const SERVICE_SEARCH: Record<number, { name: string; build: Builder }> = {
  8: { name: 'Netflix', build: (q) => `https://www.netflix.com/search?q=${q}` },
  1796: { name: 'Netflix', build: (q) => `https://www.netflix.com/search?q=${q}` },
  9: { name: 'Prime Video', build: (q) => `https://www.primevideo.com/search/?phrase=${q}` },
  119: { name: 'Prime Video', build: (q) => `https://www.primevideo.com/search/?phrase=${q}` },
  10: { name: 'Prime Video', build: (q) => `https://www.primevideo.com/search/?phrase=${q}` },
  350: { name: 'Apple TV', build: (q) => `https://tv.apple.com/search?term=${q}` },
  2: { name: 'Apple TV', build: (q) => `https://tv.apple.com/search?term=${q}` },
  15: { name: 'Hulu', build: (q) => `https://www.hulu.com/search?q=${q}` },
  11: { name: 'MUBI', build: (q) => `https://mubi.com/en/search/films?query=${q}` },
  3: { name: 'Google Play', build: (q) => `https://play.google.com/store/search?q=${q}&c=movies` },
  192: { name: 'YouTube', build: (q) => `https://www.youtube.com/results?search_query=${q}` },
  73: { name: 'Tubi', build: (q) => `https://tubitv.com/search/${q}` },
};

export function serviceLink(providerId: number, providerName: string, title: string, tmdbLink: string | null): ServiceLink {
  const entry = SERVICE_SEARCH[providerId];
  if (entry) {
    return {
      url: entry.build(encodeURIComponent(title)),
      label: `Opens ${entry.name} search for this title`,
      kind: 'search',
    };
  }
  if (tmdbLink) {
    return { url: tmdbLink, label: `Opens the TMDB watch page, which links to ${providerName}`, kind: 'tmdb' };
  }
  return { url: '', label: `No link available for ${providerName}`, kind: 'none' };
}
