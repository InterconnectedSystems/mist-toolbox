# Writing a Mist Toolbox tool

A tool is **one JavaScript file** that runs inside the browser extension. It
default-exports one object. The toolbox reads that object and builds the menu
card, the settings form, the Run/Cancel buttons, the progress bar, the activity
log, the results preview and the `.xlsx` download for you. A tool only has to
fetch data and shape it into rows.

Fastest route: open `tool-template.js` (next to this guide), copy it, and
change it. Converting an existing Python or Node script? Use **Copy AI
prompt** in the Manage tools panel. It holds everything in this guide plus the
template, ready to paste into an AI assistant along with your script.


## 1. It is not a Node or Python script

Tools run in the browser, so these do **not** exist:

| Not available | Use instead |
|---|---|
| `require(...)`, `module.exports` | `import ... from "../lib/x.js"` and `export default {...}` |
| `process.argv`, terminal prompts, `getpass` | `params` (a form the toolbox draws) |
| `process.env.MIST_TOKEN`, token prompts | the token bar at the top of the toolbox; `needs: { mistToken: true }` |
| `fetch(...)`, `requests.get`, axios | `ctx.getAll(path)` / `ctx.mistGet(path)` |
| ExcelJS, openpyxl, pandas, `fs.writeFile` | return `sheets` from `run()`; the toolbox writes the `.xlsx` |
| `console.log`, `print` | `ctx.log(message, kind)` |
| npm packages | none, apart from the toolbox's own `../lib/*.js` |

The toolbox **refuses to install** a file that uses `require`, `module.exports`,
`process.*`, `fetch`, `XMLHttpRequest`/`WebSocket`, `eval`/`new Function`,
`console.*`, browser storage (`localStorage`, `indexedDB`, `chrome.storage`…),
a `POST`, or an import from anywhere other than `../lib/`, `../engine/` or
`../mist.js`. The reasons:

- **No direct network calls.** `ctx.getAll`/`ctx.mistGet` only talk to the
  Mist region the user picked, over HTTPS, without cookies. That is what keeps
  the API token from going anywhere else.
- **Nothing is stored.** The token lives in memory for the tab and is wiped
  after 30 idle minutes. Storage could keep it around.
- **Read-only.** Mist tools only `GET`.


## 2. The tool object

```js
export default {
  id: "device-count",                 // lowercase letters, digits, dashes; unique
  name: "Device Count by Site",       // card title
  description: "What it does, in a sentence or two.",   // card text (over 30 chars)
  tag: "Mist API",                    // optional small label on the card
  notice: "Contains PII …",           // optional banner shown above the form
  needs: { mistToken: true, org: true },
  params: [ /* form fields, below */ ],
  async run(ctx) { /* … */ return { /* result, below */ }; },
};
```

`needs.mistToken: true` means the card stays locked until a token is
validated. `needs.org: true` means an organization must be selected, and
`ctx.orgId` / `ctx.orgName` are set.

### `params`: the form

Each entry draws one field. Its value arrives as `ctx.params.<id>`.

| `type` | Field | Value in `ctx.params` |
|---|---|---|
| `text` (default) | text box | string |
| `password` | hidden text box | string |
| `number` | number box | number, or `null` if blank |
| `checkbox` | checkbox | `true` / `false` |
| `select` | dropdown; `options: ["a","b"]` or `[{value, label}]` | string |
| `textarea` | multi-line box | string |
| `file` | file picker | a `File` (`await f.text()`), or `null` |

Other keys: `label`, `default`, `hint` (small text under the field),
`placeholder`, `full: true` (full-width). A `select` with
`optionsFrom: "sites"` fills itself with the org's sites (value = site id).
`optionsFrom: "orgs"` lists the token's orgs.


## 3. `ctx`: what `run()` receives

| Key | What it is |
|---|---|
| `ctx.host` | Mist API host, e.g. `api.gc2.mist.com` |
| `ctx.token` | The API token. Prefer the helpers below, which use it for you |
| `ctx.orgId` | Selected org id |
| `ctx.orgName` | Selected org name |
| `ctx.orgs` | Every org the token can see: `[{id, name}]` |
| `ctx.params` | Form values, keyed by param `id` |
| `ctx.signal` | `AbortSignal`, set when the user presses Cancel. Check `ctx.signal.aborted` in loops |
| `ctx.mount` | A DOM element below the form, for tools that draw their own view |
| `ctx.mistGet` | `await ctx.mistGet(path, params?)` returns the parsed JSON of one GET |
| `ctx.mistGetFull` | Same, but returns `{data, headers}` |
| `ctx.getAll` | `await ctx.getAll(path, params?)` follows every page and returns one array. Handles both Mist pagination styles. **Use this for lists.** |
| `ctx.searchAll` | Same for `/search` endpoints (follows the `next` cursor) |
| `ctx.listSites` | `await ctx.listSites()` returns the org's sites |
| `ctx.pool` | `await ctx.pool(limit, [() => promise, …])` runs jobs in parallel, results in input order |
| `ctx.POOL_LIMIT` | Polite parallelism for Mist (6) |
| `ctx.xlsx` | `{ sheet, workbook, STYLE, colLetter }`. Usually you only need `sheet` |
| `ctx.download` | `ctx.download(blob, filename)` saves any file to the downloads folder |
| `ctx.stampedName` | `ctx.stampedName("prefix", ctx.orgName, "xlsx")` gives `prefix_Org_20261008_141500.xlsx` |
| `ctx.safeName` | Makes a string safe as a filename |
| `ctx.toCsv` | `ctx.toCsv(headerArray, rowArrays)` returns CSV text |
| `ctx.log` | `ctx.log(message, kind)`. `kind` is `"info"`, `"ok"` or `"err"` |
| `ctx.progress` | `ctx.progress(done, total, label)` drives the progress bar |
| `ctx.status` | `ctx.status(text)` sets the short status beside Run |
| `ctx.esc` | HTML-escapes a value. Required for anything you put in `innerHTML` |
| `ctx.previewTable` | `ctx.previewTable(columns, rows, limit)` returns an HTML table |
| `ctx.fmtMac` | `"aabbccddeeff"` becomes `"aa:bb:cc:dd:ee:ff"` |
| `ctx.fmtTime` | Epoch (s or ms) to a local date-time string |
| `ctx.epochToUtc` | Epoch to `"2026-10-08 14:15:00 UTC"` |
| `ctx.fmtBytes` | `1536` becomes `"1.5 KB"` |

Paths are relative to `/api/v1`, e.g. `ctx.getAll(`/orgs/${ctx.orgId}/sites`)`.
Booleans in `params` are sent as the strings `"true"`/`"false"`, which is what
Mist expects. A non-2xx response throws an `Error` whose message says what
happened. Catch it per site if one failing site shouldn't stop the report.


## 4. What `run()` returns

```js
return {
  summary: "42 switches across 7 sites",           // shown above the preview
  filename: ctx.stampedName("mist_switches", ctx.orgName, "xlsx"),
  sheets: [
    ctx.xlsx.sheet("Switches", columns, rows, { tabColor: "1F4E78" }),
    ctx.xlsx.sheet("Info", [{ header: "Field" }, { header: "Value" }],
                   [["Org", ctx.orgName]], { autofilter: false, freeze: null }),
  ],
  preview: { title: "Switches", columns, rows },  // on-screen table (first 200 rows)
  files: [{ name: "extra.csv", blob }],           // optional extra download buttons
};
```

- **columns**: `[{ header: "Site", key: "site", width?: 20, wrap?: true }]`.
  Widths are automatic if left out.
- **rows**: objects keyed by column `key`, or plain arrays in column order. A
  row can carry `__style: "bold" | "green" | "yellow" | "red" | "blue"` to
  colour the whole row.
- Every sheet gets the house style automatically: dark blue bold header,
  frozen header row, autofilter, sized columns. Text that starts with `=` is
  stored as text, never as a formula.
- If `sheets` is present, the `.xlsx` downloads as soon as `run()` returns.
  The Download button stays for repeat saves.

Throw an `Error` to fail the run. Its message is shown to the user.


## 5. Installing

**From the toolbox:** home screen, **Manage tools**, choose the `.js`. If the
check passes, press **Install**. The first time in a tab you pick the
`mist-toolbox` folder (the one chosen with *Load unpacked*) and allow the
browser to edit it. The file is written to `tools/`, listed in
`tools/tools.json`, and the card appears straight away. If the new tool fails
to load, both files are put back as they were.

**Removing:** every tool you added has a **Remove** button under its card on
the home screen, and is listed in the Manage tools panel with the same button.
Removing deletes the file from `tools/` and takes it out of `tools/tools.json`.
Built-in tools have no Remove button and cannot be removed.

**By hand:** copy the file into `tools/`, run `npm run scan` (or add the
filename to `tools/tools.json`), and reload the extension on
`chrome://extensions` / `edge://extensions`.


## 6. Testing (optional, needs Node 18+)

```bash
npm test     # every tool in tools.json must load and pass the policy checks
```

To test a tool's logic against fake Mist data, see `tests/ssid-report.test.js`.
`stubMist({ "/orgs/org-1/sites": [...] })` answers requests from a table, and
`testCtx()` gives your `run()` the same `ctx` the toolbox does.
