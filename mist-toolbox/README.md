# Mist Toolbox

A Chrome/Edge extension (Manifest V3) that gathers the Juniper Mist and SSR
reporting tools from `/root/projects/mist/*.py` into one place, plus the existing
Mist Disconnect Console.

Everything runs in the browser. There is no Python to install, no server to run,
no backend to secure, and no third-party JavaScript — not one dependency.
Spreadsheets land in the browser's normal download list.

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
| **Wi-Fi Clients Export** | `site-wifi-clients.py` | Site · Org | Mist token + org |
| **IP Blocks / IRB Report** | `mist_ip_blocks.py` | Site · Org | Mist token + org |
| **Switch Port Inventory** | `mist_switch_port_inventory.py` | Site · Org | Mist token + org |
| **SSR Pre/Post Check** | `pre-post-check-gui.py` | SSR Conductor | Conductor URL + username/password |

Every **Site · Org** tool has an *All sites in the org* checkbox (ticked by default) and a
*Site* picker; untick the box to report on one site. The level is shown on each tool's card.
Switch Config Export downloads one `.txt` for a single switch, or one `.zip` with a folder per
site plus `index.csv` when there are several.

`parse_bgp_homing.py` was deliberately left out.

Screenshots of every tool, taken against synthetic data, are in
[`docs/screenshots/`](docs/screenshots/README.md). Regenerate them with
`node --experimental-websocket scripts/screenshots/capture.mjs`, which loads the extension
into headless Chromium and answers every API call from `scripts/screenshots/fixtures.mjs`.

### Differences from the Python worth knowing

- **Region.** `mist_ssid_report.py` and `site-wifi-clients.py` hardcoded
  `api.gc2.mist.com`. All tools now take the region from the picker, which covers
  all 13 Mist clouds including `api.us.mist-federal.com`.
- **Org choice.** `site-wifi-clients.py` silently used the first org the token
  could see. You now choose.
- **File names.** `site-wifi-clients.py` always wrote
  `all_sites_wifi_clients.xlsx`, overwriting the previous run. Every export is
  now timestamped.
- **Pagination.** The Wi-Fi client export used to stop at the first short page,
  which under-reports a busy site. It now honours `X-Page-Total` like
  `mist_switch_port_inventory.py` did.
- **PII.** The Wi-Fi client export contains usernames, hostnames, MAC and IP
  addresses and guest names/emails/companies. The tool says so before you run it.

### SSR Pre/Post Check

Snapshot the nine checks across the routers you select, make your change, then
run the post-check to diff every value that moved — with character-level
highlighting on click, and CSV export matching the Python's columns exactly
(Router, Check, Path, Pre Value, Post Value, Change).

Three things the desktop script could do that a browser extension cannot:

- **Skip certificate verification.** The Python defaulted to `verify=False` and
  could load a CA bundle. `fetch()` offers neither. If your Conductor uses a
  self-signed or internal-CA certificate, open `https://<conductor>` in a tab
  once and accept the certificate; the tool shows this prompt with a direct link
  when a connection fails. Note that an unreachable host and a rejected
  certificate are indistinguishable to a web page, so the message covers both.
- **Keep snapshots in a working directory.** Pre-check data is held in memory for
  a same-session pre -> post run. For a change window that outlives the tab, use
  **Download pre-check snapshot** and **Load pre-check snapshot**. (Deliberately
  not browser storage — see the policy below.)
- **Scrub the password from memory.** `_secure_erase`'s `ctypes.memset` has no JS
  equivalent; strings are immutable. The field is cleared once the password is
  exchanged for a bearer token, and that is all that can be promised.

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

**By hand:**

```bash
cp my-report.js tools/     # drop it in
npm run scan               # regenerates tools/tools.json
npm test                   # the registry test checks it loads and is valid
```

then press reload on the extension's card. A tool that fails to load shows as
a card explaining why, and does not take the menu down with it.

## Security posture

Enforced mechanically by `tests/policy.test.js`, not just by convention:

- **No credential is ever persisted.** No `chrome.storage`, `localStorage`,
  `sessionStorage`, IndexedDB or cookie access appears anywhere in shipped code.
- **No credential crosses to the service worker.** No `chrome.runtime.sendMessage`
  or `connect`.
- **No `console.*`** in shipped code, so nothing can leak to devtools.
- **One `fetch` in `mist.js`**, carrying the host allowlist check, the HTTPS
  check and `credentials: "omit"` so no cookie rides along.
- **No `permissions` array.** Downloads use a Blob anchor, which needs none.
- **`host_permissions` equals `MIST_HOSTS` exactly, in order** — 13 Mist regions,
  nothing else. The SSR Conductor comes from `optional_host_permissions` and is
  granted at runtime, per origin, only when you connect.
- **Mist requests are GET only.** POST is confined to `tools/ssr-pre-post.js`,
  where it is the login exchange and one Conductor stats endpoint that only
  answers to POST. Nothing in this extension writes configuration anywhere.
- **The credential bar is not a `<form>`**, so no password manager offers to save
  an API token.
- All API-sourced text is escaped before it reaches the DOM.

## Tests

```bash
npm test      # node --test tests/ — no dependencies
```

143 tests, including:

- `parity.test.js` — the disconnect console's original 190 assertions, unchanged,
  against the copied `engine/`
- `subnet.test.js` — a fixture generated by Python's own `ipaddress` module, so
  the IPv4/IPv6 math is provably identical (IPv6 held as `BigInt`, because an
  overlap sweep comparing `/64` network addresses overflows a `Number`)
- `paginate.test.js` — both Mist pagination regimes, including that a short page
  does **not** end a walk and that a cursor is never followed to another host
- `port-inventory.test.js` — the virtual-chassis attribution, port-range
  expansion with zero padding, and the four-source merge
- `ssr-pre-post.test.js` — `SequenceMatcher` opcodes checked against Python's
  `difflib` with `autojunk=False`
- `policy.test.js` — every rule in the section above
- `imports.test.js` — static check that the module graph and element ids line up,
  since the shell cannot be imported in Node

## Verifying against the Python

The real check is output parity: run a Python script and its ported tool against
the same org with the same token and compare row counts and spot-check columns.

That cannot be done on this server — there is no `pip`, and `openpyxl`, `pandas`
and `xlsxwriter` are all absent (only `python3-requests` is installed). Do it on
a machine that already runs these scripts.

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
