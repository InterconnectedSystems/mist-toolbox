# Mist Toolbox

A Chrome/Edge extension (Manifest V3) that gathers the Juniper Mist and SSR
reporting scripts in this repository into one place, plus the existing
Mist Disconnect Console.

Everything runs in the browser. There is no Python to install, no server to run,
no backend to secure, and no third-party JavaScript — not one dependency.
Spreadsheets land in the browser's normal download list.

> **New here?** [Download `mist-toolbox.zip`](https://github.com/InterconnectedSystems/mist-toolbox/releases/latest/download/mist-toolbox.zip) for the easiest install, then follow
> [INSTALL.md](../INSTALL.md). · [Add your own tools with an AI assistant](../ADDING_TOOLS.md)

## Install

The extension is plain static files; there is nothing to build.

**Chrome**

1. Go to `chrome://extensions`
2. Turn on **Developer mode** (top right)
3. Click **Load unpacked**
4. Select this directory (`mist-toolbox`)
5. Pin the **Mist Toolbox** icon to the toolbar, then click it

**Edge**

1. Go to `edge://extensions`
2. Turn on **Developer mode** (left sidebar)
3. Click **Load unpacked**
4. Select this directory
5. Click the Mist Toolbox icon

Edge and Chrome share the same engine here; `minimum_chrome_version` is 116 and
Edge 116+ satisfies it.

To update, replace the directory's contents and press the reload arrow on the
extension's card.

## Using it

Clicking the toolbar icon opens the toolbox in a tab — one tab, reused.

1. Pick your **Mist region** and paste a **read-only (Observer) API token**, then
   press **Validate token**. Create the token in the Mist portal under
   *My Account -> API Tokens*; an Observer-role token is enough for every tool
   here, and nothing in this extension issues a write to Mist.
2. Choose an **organization** if the token sees more than one.
3. Pick a tool, set its options, press **Run**.
4. The `.xlsx` downloads on completion. The on-screen table is a preview capped
   at 200 rows; the file always has everything.

The token lives in memory in that tab only. It is never written to
`chrome.storage`, `localStorage` or IndexedDB, never sent to the service worker,
never logged, and it is wiped after 30 minutes without interaction, when you
press **End session**, or whenever the tab closes or reloads.

## The tools

| Tool | Ported from | Level | Needs |
|---|---|---|---|
| **Disconnect Console** | the existing v1.4 extension | Site · Client | its own token (opens in its own tab) |
| **SSID Report** | `mist_ssid_report.py` | Site · Org | Mist token + org |
| **Switch Software Report** | `mist_switch_report.js` | Site · Org | Mist token + org |
| **Switch Config Export** | `mist_ip_blocks.py --save-configs` | Site · Org | Mist token + org |
| **Site Alarms** | `site-alarms.js` (added as written) | Site · Org | Mist token + org |
| **Client Wi-Fi PHY Inspector** | `client-wifi-phy.js` (added as written) | Site · Client | Mist token + org |
| **Switch PSU Status** | `switch-psu-status.js` (added as written) | Site · Org | Mist token + org |
| **Switch Additional CLI** | `switch-additional-cli.js` (added as written) | Site · Org | Mist token + org |
| **Wi-Fi Clients Export** | `site-wifi-clients.py` | Site · Org | Mist token + org |
| **IP Blocks / IRB Report** | `mist_ip_blocks.py` | Site · Org | Mist token + org |
| **Switch Port Inventory** | `mist_switch_port_inventory.py` | Site · Org | Mist token + org |
| **SSR Pre/Post Check** | `pre-post-check-gui.py` | SSR Conductor | Conductor URL + username/password |


### SSR Pre/Post Check

Snapshot the nine checks across the routers you select, make your change, then
run the post-check to diff every value that moved — with character-level
highlighting on click, and CSV export matching the Python's columns exactly
(Router, Check, Path, Pre Value, Post Value, Change).

The Conductor host is not in `host_permissions`. The first time you connect, the
browser asks permission for that one origin.

## Adding a tool

**From the toolbox (no command line):** on the home screen press **Manage tools**
and choose the tool's `.js` file. It is checked before anything is written:
Node or Python scripts, `fetch`, storage, `console.*`, POSTs and npm imports
are refused with an explanation. Press **Install**. The first time in a tab
you pick the `mist-toolbox` folder (the one you chose with *Load unpacked*)
and allow the browser to edit it. The file is written to `tools/`, listed in
`tools/tools.json`, and its card appears without reloading, so the token
survives. If the new tool fails to load, both files are put back.

**Removing a tool:** every added tool has a **Remove** button under its card
(and in the Manage tools panel). It deletes the file from `tools/` and takes
it out of `tools/tools.json`. A tool that failed to load can be removed the
same way. The built-in tools have no Remove button.

This works because an unpacked extension is an ordinary folder. The File
System Access API needs no manifest permission, and the folder handle stays in
page memory only. A store-installed (packed) copy cannot be written to; use
the manual route there.

**Writing a tool:** see `docs/TOOL_GUIDE.md` (also linked as *Authoring guide*
in the panel) and start from `docs/tool-template.js`. To convert an existing
Python or Node script, press **Copy AI prompt**, paste the prompt into an AI
assistant, add your script at the end, and install the file it returns.
`tests/docs.test.js` keeps the guide's `ctx` table and the prompt's example in
step with the code.



## Layout

```
manifest.json          MV3 manifest: 13 Mist hosts, no permissions array
background.js          opens/focuses the toolbox tab; never sees a credential
toolbox.html/.css/.js  the shell: credentials, menu, generated forms, run lifecycle
console.html/.js       the Disconnect Console, v1.4, essentially untouched
mist.js                Mist transport: one fetch, pooling, 429 backoff
engine/                the disconnect console's correlation engine, DOM-free
lib/
  zip.js               ZIP writer over the platform's CompressionStream
  xlsx.js              styled multi-sheet OOXML, replacing openpyxl/xlsxwriter
  paginate.js          Mist's two pagination regimes
  subnet.js            IPv4/IPv6 math, replacing Python's ipaddress
  junos.js             shlex.split plus the Junos IRB/VLAN parser
  switchports.js       the port inventory's merge rules
  diff.js              flatten/compute_changes plus difflib's SequenceMatcher
  dom.js, download.js  shared rendering and download helpers
tools/
  tools.json           the registry: filenames, one per tool
  registry.js          loader and validator
  *.js                 one file per tool
scripts/scan-tools.mjs regenerates tools.json from the directory
tests/                 node --test, no dependencies
```
