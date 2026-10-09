# Mist Toolbox

**Read-only reporting for Juniper Mist and Juniper SSR, in a browser extension that grows
with you.** Paste a read-only Mist API token, pick an org (and optionally one site), pick a
tool, and get the answer on screen and as a styled Excel workbook. There is no Python, no
server and no install beyond the extension. You can add your own tools too: the extension
ships its own **LLM spec**, so any AI assistant can turn a script or a one-line idea into a new
tool you can install with one click.

### ⬇ [Download mist-toolbox.zip](https://github.com/InterconnectedSystems/mist-toolbox/releases/latest/download/mist-toolbox.zip) (easiest install)

Unzip it, then in Chrome or Edge: **Extensions → Developer mode → Load unpacked →** pick the
unzipped `mist-toolbox` folder. Full steps: **[INSTALL.md](INSTALL.md)**.

**[Install guide](INSTALL.md)** · **[Add your own tools](ADDING_TOOLS.md)** · [Community tools](mist-toolbox/community/README.md) · [All releases](https://github.com/InterconnectedSystems/mist-toolbox/releases/latest) · [Extension README](mist-toolbox/README.md)

![The tool menu](mist-toolbox/docs/screenshots/02-home.png)

## What you can do with it

### Wireless
- **Find every SSID that actually applies at each site**, including ones pushed down from org
  WLAN templates, with auth type, VLAN, bands and which template it came from. *(SSID Report)*
- **Export every connected Wi-Fi client**: hostname, user, MAC, IP, SSID, band, 802.11
  standard, RSSI/SNR, last seen and guest-portal details, one site or the whole org.
  *(Wi-Fi Clients Export)*
- **Root-cause why one client keeps disconnecting**: RF and SNR, 802.11 reason codes, DHCP
  after roam, RRM channel changes, DFS radar on the AP it was on, and Teams/Zoom call quality,
  correlated into a verdict. *(Disconnect Console)*
- **Inspect one client's radio link**: RSSI, SNR and noise floor graded against design
  thresholds, PHY rate against what the link could do, retries, channel load and non-Wi-Fi
  interference, overlapping AP radios, Wi-Fi generation and roaming, as a colour-coded
  dashboard. *(Client Wi-Fi PHY Inspector)*

### Switching
- **Audit switch software**: every switch's model, serial, firmware, status, IP, uptime and
  per-member versions for Virtual Chassis. *(Switch Software Report)*
- **Inventory every switch port**: 41 columns of live status, speed, VLAN, PoE draw, LLDP
  neighbour and STP, merged with the configured port profile and attributed to the right VC
  member. *(Switch Port Inventory)*
- **Back up switch configurations**: one `.txt` per switch, or a `.zip` with a folder per site
  and an index. *(Switch Config Export)*
- **Map your IP space**: every IRB/VLAN interface address with subnet, mask, broadcast and
  usable range, with duplicate and overlapping networks flagged across sites.
  *(IP Blocks / IRB Report)*
- **Check power supply redundancy**: every switch's PSUs, per Virtual Chassis member, with
  failed supplies and switches running on a single supply flagged. *(Switch PSU Status)*
- **Compare additional CLI**: every "additional CLI commands" block at template, switch-rule,
  site and device level, side by side, with a de-duplicated list of commands. *(Switch Additional CLI)*

### Routing
- **See every BGP session and WAN peer path at once**: switch BGP (EVPN overlay and underlay),
  WAN-edge BGP on SSR and SRX, and every SSR peer path and SRX IPsec path with latency, jitter,
  loss and MOS, for one site or the whole org in a single org-wide pass. Down, degraded and
  recently re-established sessions are listed first, on a colour board you can open full
  screen. *(BGP Sessions)*

### Operations
- **See what's alarming**: every alarm over the past day or week, by site and by type, with
  severity, affected devices and acknowledgement status. *(Site Alarms)*
- **Prove a change window was clean** on Juniper SSR: snapshot BGP, OSPF, interfaces,
  adjacencies, node status, sessions and alarms on every router before a change, then again
  after. The output is laid out like the CLI and every changed field is highlighted.
  *(SSR Pre/Post Check)*

### Every report
- **One site or the whole org**: tick *All sites in the org*, or pick a site.
- **Excel output**: header styling, frozen header row, filters and sized columns,
  timestamped filenames, saved to your downloads.
- **Read-only by design**: Mist tools only ever `GET`. The token stays in that tab's memory,
  is never saved, only goes to the Mist region you picked, and is wiped after 30 idle minutes.

## Additive: bring your own tools, with the LLM spec built in

The tools above are a starting point. A tool is one JavaScript file, and the toolbox provides
everything around it: the menu card, credentials, site picker, settings form, progress, preview
and Excel output. So adding a tool doesn't mean changing the extension.

You don't have to write the file either. The extension carries **its own LLM spec**,
[`TOOL_PROMPT.md`](mist-toolbox/docs/TOOL_PROMPT.md): a ready-made prompt that teaches any AI
assistant the tool format, the helpers, the security rules and a full working example.

1. **Manage tools → Copy AI prompt**
2. Paste it into Claude, ChatGPT, Copilot or any assistant, then paste your existing
   Python/Node script, or just describe the report you want, below the marked line.
3. Save the reply as a `.js` file, then **Manage tools → Install**. It is checked first,
   written into the extension, and appears in the menu straight away.
4. Remove it any time with the **Remove** button on its card.

![An AI-written tool passes the check](mist-toolbox/docs/screenshots/18-manage-check-passed.png)

![The new tool in the menu, marked added](mist-toolbox/docs/screenshots/20-home-added-tool.png)

The full walkthrough with screenshots is in **[ADDING_TOOLS.md](ADDING_TOOLS.md)**.

## Community tools

Written a tool others could use? Share it. Contributed tools live in
[`mist-toolbox/community/`](mist-toolbox/community/README.md): browse the list, download one
and install it with **Manage tools → Install**. Every contribution is checked in CI against the
same rules the installer enforces. To add yours, see **[CONTRIBUTING.md](CONTRIBUTING.md)**. To
ask for a tool, [open a tool request](https://github.com/InterconnectedSystems/mist-toolbox/issues/new?template=tool-request.md).

## Install

Chrome or Edge, on Windows, macOS or Linux:

1. **[Download `mist-toolbox.zip`](https://github.com/InterconnectedSystems/mist-toolbox/releases/latest/download/mist-toolbox.zip)**, the latest release. Unzip it somewhere
   permanent (the browser runs the extension from that folder).
2. Open `chrome://extensions` (or `edge://extensions`) and turn on **Developer mode**.
3. **Load unpacked** → select the unzipped **`mist-toolbox`** folder.
4. Pin the icon, click it, choose your region, paste a read-only API token, **Validate**.

Details, updating and troubleshooting: **[INSTALL.md](INSTALL.md)**.

## Screenshots

All screenshots use synthetic data ("Demo Org", example.com names, private addresses). They are
generated by `node --experimental-websocket mist-toolbox/scripts/screenshots/capture.mjs`,
which drives the real extension in headless Chromium.

| | |
|---|---|
| ![Switch Software Report, one site](mist-toolbox/docs/screenshots/04-switch-report-single-site.png)<br>**Switch Software Report**, one site | ![SSID Report](mist-toolbox/docs/screenshots/03-ssid-report.png)<br>**SSID Report** |
| ![Switch Port Inventory](mist-toolbox/docs/screenshots/09-port-inventory.png)<br>**Switch Port Inventory** | ![Switch Config Export](mist-toolbox/docs/screenshots/05-switch-config-export.png)<br>**Switch Config Export** |
| ![IP Blocks / IRB Report](mist-toolbox/docs/screenshots/08-ip-blocks.png)<br>**IP Blocks / IRB Report** | ![Site Alarms](mist-toolbox/docs/screenshots/06-site-alarms.png)<br>**Site Alarms** |
| ![Wi-Fi Clients Export](mist-toolbox/docs/screenshots/07-wifi-clients.png)<br>**Wi-Fi Clients Export** | ![Disconnect Console](mist-toolbox/docs/screenshots/13-disconnect-console.png)<br>**Disconnect Console** |
| ![Switch PSU Status](mist-toolbox/docs/screenshots/09b-switch-psu-status.png)<br>**Switch PSU Status** | ![Switch Additional CLI](mist-toolbox/docs/screenshots/09c-switch-additional-cli.png)<br>**Switch Additional CLI** |
| ![Client Wi-Fi PHY Inspector](mist-toolbox/docs/screenshots/07b-client-wifi-phy.png)<br>**Client Wi-Fi PHY Inspector** | ![BGP Sessions](mist-toolbox/docs/screenshots/09d-bgp-sessions.png)<br>**BGP Sessions** |
| ![SSR post-check, changes highlighted](mist-toolbox/docs/screenshots/11-ssr-post-highlighted.png)<br>**SSR Pre/Post**: changed fields highlighted | ![SSR pre and post side by side](mist-toolbox/docs/screenshots/12-ssr-side-by-side.png)<br>**SSR Pre/Post**: side by side |

Every screenshot with a caption: [`mist-toolbox/docs/screenshots/`](mist-toolbox/docs/screenshots/README.md).

## What's in this repository

- [`mist-toolbox/`](mist-toolbox/) is the extension: tools, shared libraries, docs and 225 tests
  (`npm test`).
- The original scripts (`mist_*.py`, `site-wifi-clients.py`, `pre-post-check-gui.py`,
  `mist_switch_report.js`, `site-alarms.js`, `client-wifi-phy.js`, `switch-psu-status.js`,
  `switch-additional-cli.js`) are kept for reference and for comparing output.
