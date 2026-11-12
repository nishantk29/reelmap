# VPN automation support

All facts below were checked 2026-11-12 against vendor or Apple sources only. Where a vendor does not document something, the cell says "not documented". Vendor apps change often; re-check before relying on any command.

## Market-share note

Security.org's 2026 VPN report (survey of 1,008 U.S. adults, August 2026, last updated 2026-09-16) lists the most-used VPN brands by share of users as: NordVPN 24%, Proton VPN 15%, Norton VPN 9%, Cisco Secure Client 9%, ExpressVPN 7%. Surfshark is sixth (6%) and Mullvad is about 3%. Source: [security.org VPN consumer report](https://www.security.org/resources/vpn-consumer-report-annual/) (checked 2026-11-12).

On that list, Norton VPN would swap in for a consumer top five (Cisco Secure Client is mainly an enterprise remote-access client, so it is not covered here). Norton VPN is included below. The data is U.S.-only.

## ExpressVPN

| Item | Finding | Source |
|---|---|---|
| Shortcuts/App Intents actions | Yes on iOS: "connect and disconnect actions that you can build into automations" (announced 2025-09-10). Siri: "Hey Siri, turn on ExpressVPN" / "turn off ExpressVPN". | [ExpressVPN blog](https://www.expressvpn.com/blog/expressvpn-siri-update/), [iOS help](https://www.expressvpn.com/support/vpn-setup/app-for-ios/) (checked 2026-11-12) |
| Location parameter in Shortcuts | Not documented. Siri and the widget use the most recent server location; ExpressVPN says voice location selection "will arrive in a future update". | [ExpressVPN blog](https://www.expressvpn.com/blog/expressvpn-siri-update/) (checked 2026-11-12) |
| URL scheme / deep link | Not documented | [iOS help](https://www.expressvpn.com/support/vpn-setup/app-for-ios/) (checked 2026-11-12) |
| Official CLI | Yes, `expressvpnctl` (current Linux app). The older `expressvpn` command is not mentioned in current docs. | [Linux CLI help](https://www.expressvpn.com/support/vpn-setup/app-for-linux-cli/) (checked 2026-11-12) |
| CLI connect syntax | `expressvpnctl get regions` to list; `expressvpnctl connect "LOCATION"` with the exact location name in quotes, e.g. `expressvpnctl connect "Germany - Frankfurt - 1"`; `expressvpnctl disconnect`. Requires the GUI running or `expressvpnctl background enable`. | [Linux CLI help](https://www.expressvpn.com/support/vpn-setup/app-for-linux-cli/) (checked 2026-11-12) |
| CLI OSes | 64-bit Linux: Ubuntu 24.04+, Debian 12+, Fedora 39+, Arch, Raspberry Pi OS 64-bit (Bookworm+), Linux Mint 22+. macOS/Windows CLI: not documented. | [Linux CLI help](https://www.expressvpn.com/support/vpn-setup/app-for-linux-cli/) (checked 2026-11-12) |
| Notes | Location argument is a display name (country, city, number), not a country code. Run `expressvpnctl get regions` to get valid values. | Same as above |

## NordVPN

| Item | Finding | Source |
|---|---|---|
| Shortcuts/App Intents actions | Siri shortcuts on iOS: "Secure my connection" and "Disconnect". | [NordVPN help](https://support.nordvpn.com/hc/en-us/articles/20278320217873) (checked 2026-11-12) |
| Location parameter in Shortcuts | Not documented | Same as above |
| URL scheme / deep link | Not documented | Same as above |
| Official CLI | Yes, `nordvpn` (Linux app) | [Linux install help](https://support.nordvpn.com/hc/en-us/articles/20196094470929-Installing-NordVPN-on-Linux-distributions) (checked 2026-11-12) |
| CLI connect syntax | `nordvpn connect` (recommended server); `nordvpn connect uk715` (country code plus server number); `nordvpn countries`; `nordvpn cities united_states` (names use underscores). Connecting by country name alone is not shown on this page. | Same as above |
| CLI OSes | Linux: Debian 12+, Ubuntu 22.04+, Linux Mint 21+, Raspberry Pi OS, Fedora 43+ | Same as above |
| Notes | Use `nordvpn countries` output as the list of valid country values. | Same as above |

## Proton VPN

| Item | Finding | Source |
|---|---|---|
| Shortcuts/App Intents actions | Yes (iOS/iPadOS): Connect to region, Connect to VPN, Quick Connect, Get connection status, Disconnect from VPN. macOS: not documented. | [Proton help](https://protonvpn.com/support/ios-shortcuts) (checked 2026-11-12) |
| Location parameter in Shortcuts | Yes: "Connect to region" takes country, city, or state. Requires a paid plan. | Same as above |
| URL scheme / deep link | Not documented | Same as above |
| Official CLI | Yes, `protonvpn` (official Linux CLI, also on [GitHub](https://github.com/ProtonVPN/proton-vpn-cli)) | [Linux CLI help](https://protonvpn.com/support/use-linux-cli) (checked 2026-11-12) |
| CLI connect syntax | `protonvpn connect --country US` or `protonvpn connect --country "United States"`; also `--city`. Not case sensitive. | Same as above |
| CLI OSes | Linux (install guides for Debian, Ubuntu, Fedora). macOS/Windows CLI: not documented. | Same as above |
| Notes | Cannot run alongside the Proton VPN GUI app, per the GitHub README. | [GitHub](https://github.com/ProtonVPN/proton-vpn-cli) (checked 2026-11-12) |

## Surfshark

| Item | Finding | Source |
|---|---|---|
| Shortcuts/App Intents actions | Siri Shortcuts to connect or disconnect on iOS (Feb 2023 release). Action names not documented. | [Surfshark blog](https://surfshark.com/blog/surfshark-news-february-2023) (checked 2026-11-12) |
| Location parameter in Shortcuts | Not documented | Same as above |
| URL scheme / deep link | Not documented | [iOS setup help](https://support.surfshark.com/hc/en-us/articles/360010801220-How-to-set-up-Surfshark-on-iOS) (checked 2026-11-12) |
| Official CLI | Only a legacy CLI, `surfshark-vpn`, documented as "Legacy version". The current Linux app is a GUI. | [Legacy Linux help](https://support.surfshark.com/hc/en-us/articles/360017418334), [current Linux help](https://support.surfshark.com/hc/en-us/articles/5067279648146) (checked 2026-11-12) |
| CLI connect syntax | Legacy, run as root: `surfshark-vpn` then pick a location number interactively; `surfshark-vpn attack` for the optimal location. No documented non-interactive country argument. | [Legacy Linux help](https://support.surfshark.com/hc/en-us/articles/360017418334) (checked 2026-11-12) |
| CLI OSes | Linux (legacy) | Same as above |
| Notes | Not scriptable by country per official docs. | Same as above |

## Mullvad

| Item | Finding | Source |
|---|---|---|
| Shortcuts/App Intents actions | Not documented in the iOS help. Mullvad's audit write-up mentions an opt-in Siri integration, without action details. | [iOS help](https://mullvad.net/en/help/using-mullvad-app-on-ios), [audit post](https://mullvad.net/en/blog/security-audit-report-for-our-app-available) (checked 2026-11-12) |
| Location parameter in Shortcuts | Not documented | Same as above |
| URL scheme / deep link | Not documented | Same as above |
| Official CLI | Yes, `mullvad` (ships with the desktop app) | [CLI help](https://mullvad.net/en/help/how-use-mullvad-cli) (checked 2026-11-12) |
| CLI connect syntax | `mullvad relay set location se` then `mullvad connect` (two-letter country code, lowercase in all examples) | Same as above |
| CLI OSes | Linux, macOS, Windows | Same as above |
| Notes | Only provider here with an official CLI on all three desktop OSes. | Same as above |

## Norton VPN (swap-in per market-share note)

| Item | Finding | Source |
|---|---|---|
| Shortcuts/App Intents actions | Not documented | [Norton support](https://support.norton.com/) (checked 2026-11-12) |
| Location parameter in Shortcuts | Not documented | Same as above |
| URL scheme / deep link | Not documented | Same as above |
| Official CLI | Not documented | Same as above |
| CLI connect syntax | Not documented | Same as above |
| CLI OSes | Not documented (no official Linux app found) | Same as above |
| Notes | Norton's Siri shortcut article covers Norton Genie scam checks, not the VPN. | [Norton support article](https://support.norton.com/sp/en/us/home/current/solutions/v2025112120510480) (checked 2026-11-12) |

## Apple platform

- **Set VPN action.** Added in iOS/iPadOS 16.4 and macOS 13.3. It connects, disconnects, or sets the On Demand setting for any VPN on iOS and macOS. Apple does not list which configuration types are excluded. Source: [What's new in Shortcuts](https://support.apple.com/en-us/101583) (checked 2026-11-12).
- **Shortcuts URL scheme.** `shortcuts://run-shortcut?name=[name]&input=[input]&text=[text]`. `input` may be `text` or `clipboard`; `text` is used when `input=text`. Source: [Run a shortcut from a URL](https://support.apple.com/guide/shortcuts/run-a-shortcut-from-a-url-apd624386f42/ios) (checked 2026-11-12).
- **Signing.** `shortcuts sign --mode people-who-know-me --input "Share me.shortcut" --output "Share me signed.shortcut"` is documented in the Mac Shortcuts guide; signing sends a copy to Apple for validation. Apple documents this command only for macOS; no Linux or server signing method is documented. Source: [Run shortcuts from the command line](https://support.apple.com/guide/shortcuts-mac/run-shortcuts-from-the-command-line-apd455c82f02/mac) (checked 2026-11-12).
- **WireGuard.** Official iOS and macOS apps are on the App Store ([wireguard.com/install](https://www.wireguard.com/install/)). The App Store listing says the app "can import new tunnels from archives and files, from QR codes, or you can create one from scratch" ([App Store](https://apps.apple.com/us/app/wireguard/id1441195209)). Whether WireGuard tunnels appear in Set VPN is not documented by WireGuard or Apple beyond Apple's "any VPN" wording (checked 2026-11-12).

## What Reelmap automates

- A website cannot connect, disconnect, or change a VPN. Browsers have no API for this.
- On iOS/macOS, Reelmap can open a `shortcuts://run-shortcut?...` URL that runs a shortcut the user has already installed. That shortcut can use a vendor action (only Proton VPN documents a country parameter) or Apple's Set VPN for an installed configuration, then open the streaming app.
- On desktop, Reelmap can show copyable commands for vendors with an official CLI: ExpressVPN (Linux), NordVPN (Linux), Proton VPN (Linux), Mullvad (Linux, macOS, Windows). The user runs them.
- Surfshark and Norton VPN have no documented way to pick a country from a script or shortcut; Reelmap can only tell the user to choose the country in the app.
