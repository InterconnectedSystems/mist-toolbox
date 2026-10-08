# Mist Toolbox

A Chrome / Edge extension of read-only reporting tools for **Juniper Mist** and **Juniper SSR**,
replacing a set of Python and Node scripts. No Python, no server, nothing to install beyond
the extension: paste a read-only Mist API token, pick an org, pick a tool, and the report
downloads as `.xlsx` (or `.txt` / `.zip` for switch configs).

- **Extension:** [`mist-toolbox/`](mist-toolbox/): install steps, tool list, security model
  and how to add your own tools are in its [README](mist-toolbox/README.md).
- **Original scripts** (`mist_*.py`, `site-wifi-clients.py`, `pre-post-check-gui.py`,
  `mist_switch_report.js`, `site-alarms.js`) are kept alongside for reference and for
  checking the ports' output against them.

## Install

1. Download or clone this repository.
2. Open `chrome://extensions` (or `edge://extensions`), turn on **Developer mode**.
3. **Load unpacked** → select the `mist-toolbox` folder. Pin the icon.

## Screenshots

All screenshots use synthetic data ("Demo Org", example.com names, documentation and private
addresses). They are regenerated with
`node --experimental-websocket mist-toolbox/scripts/screenshots/capture.mjs`.

### Tool menu — each card shows whether the tool works per site / org, per client, or against an SSR Conductor

![Tool menu — each card shows whether the tool works per site / org, per client, or against an SSR Conductor](mist-toolbox/docs/screenshots/02-home.png)

### Switch Software Report for one site: untick **All sites in the org**, pick a site

![Switch Software Report for one site: untick **All sites in the org**, pick a site](mist-toolbox/docs/screenshots/04-switch-report-single-site.png)

### SSID Report — every SSID per site, including ones pushed from org templates

![SSID Report — every SSID per site, including ones pushed from org templates](mist-toolbox/docs/screenshots/03-ssid-report.png)

### Switch Config Export — one .txt per switch, zipped with a folder per site

![Switch Config Export — one .txt per switch, zipped with a folder per site](mist-toolbox/docs/screenshots/05-switch-config-export.png)

### Site Alarms — past 7 days across all sites

![Site Alarms — past 7 days across all sites](mist-toolbox/docs/screenshots/06-site-alarms.png)

### Wi-Fi Clients Export

![Wi-Fi Clients Export](mist-toolbox/docs/screenshots/07-wifi-clients.png)

### IP Blocks / IRB Report — subnets computed, duplicates across sites flagged

![IP Blocks / IRB Report — subnets computed, duplicates across sites flagged](mist-toolbox/docs/screenshots/08-ip-blocks.png)

### Switch Port Inventory

![Switch Port Inventory](mist-toolbox/docs/screenshots/09-port-inventory.png)

### SSR Pre/Post Check — connect, choose routers and checks, run the pre-check

![SSR Pre/Post Check — connect, choose routers and checks, run the pre-check](mist-toolbox/docs/screenshots/10-ssr-pre-check.png)

### SSR post-check output laid out like the CLI, changed fields highlighted

![SSR post-check output laid out like the CLI, changed fields highlighted](mist-toolbox/docs/screenshots/11-ssr-post-highlighted.png)

### SSR pre and post side by side

![SSR pre and post side by side](mist-toolbox/docs/screenshots/12-ssr-side-by-side.png)

### SSR change table, exportable to CSV

![SSR change table, exportable to CSV](mist-toolbox/docs/screenshots/12b-ssr-diff-table.png)

### Disconnect Console — built-in sample investigation

![Disconnect Console — built-in sample investigation](mist-toolbox/docs/screenshots/13-disconnect-console.png)

### Manage tools — install your own tool; a Node script is explained, not installed

![Manage tools — install your own tool; a Node script is explained, not installed](mist-toolbox/docs/screenshots/14-manage-tools.png)
