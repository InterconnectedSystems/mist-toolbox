# Convert a script into a Mist Toolbox tool

You are converting a script (Python, Node.js, PowerShell, or anything else) into a
**Mist Toolbox tool**: one ES-module JavaScript file that runs inside a Chrome/Edge
extension. Read all of the rules below, then convert the script pasted at the end.

## What a tool is

The file default-exports one object. The toolbox draws the menu card, a form from
`params`, Run/Cancel, a progress bar, an activity log, an on-screen preview, and
writes the `.xlsx` download itself. The tool only fetches data and shapes rows.

```js
export default {
  id: "kebab-case-id",          // lowercase letters, digits, dashes
  name: "Human Name",
  description: "One or two sentences (more than 30 characters) saying what the report contains.",
  tag: "Mist API",
  needs: { mistToken: true, org: true },   // token + selected org are supplied by the toolbox
  params: [ /* form fields */ ],
  async run(ctx) { /* ... */ return { summary, filename, sheets, preview }; },
};
```

`params` entries: `{ id, label, type, default, hint, options, optionsFrom }` where
`type` is one of `text`, `password`, `number`, `checkbox`, `select`, `textarea`, `file`.
Values arrive as `ctx.params.<id>` (number → number or null, checkbox → boolean,
file → File or null). A `select` with `optionsFrom: "sites"` lists the org's sites
(value = site id).

## The `ctx` object `run()` receives

- `ctx.host`, `ctx.orgId`, `ctx.orgName`, `ctx.orgs`, `ctx.params`, `ctx.signal` (AbortSignal for Cancel)
- `await ctx.getAll(path, params?)` → array; follows **all** Mist pagination. Use for every list endpoint.
- `await ctx.mistGet(path, params?)` → parsed JSON of one GET. `ctx.mistGetFull` → `{data, headers}`.
- `await ctx.searchAll(path, params?)` → array, for `/search` endpoints.
- Paths are relative to `/api/v1`, e.g. `` `/orgs/${ctx.orgId}/sites` ``. Non-2xx throws an Error.
- `await ctx.pool(ctx.POOL_LIMIT, jobs)` — run an array of `() => promise` with limited parallelism; results keep input order.
- `ctx.log(msg, "info" | "ok" | "err")`, `ctx.progress(done, total, label)`, `ctx.status(text)`
- `ctx.xlsx.sheet(name, columns, rows, opts?)` — columns `[{header, key, width?, wrap?}]`; rows are objects keyed by `key` (or arrays). Row `__style: "bold"|"green"|"yellow"|"red"|"blue"` colours a row. opts: `{ tabColor: "1F4E78", autofilter: false, freeze: null }`.
- `ctx.stampedName(prefix, ctx.orgName, "xlsx")` → timestamped filename.
- `ctx.download(blob, name)`, `ctx.toCsv(headerArray, rowArrays)`, `ctx.esc(s)` (HTML-escape)
- `ctx.fmtMac`, `ctx.fmtTime(epoch)`, `ctx.epochToUtc(epoch)`, `ctx.fmtBytes(n)`

`run()` returns `{ summary, filename, sheets: [ctx.xlsx.sheet(...)], preview: { title, columns, rows } }`.
Header styling, frozen header, autofilter and column widths are applied automatically.
Throw an `Error` to fail with a message.

## Hard rules — the toolbox refuses files that break them

1. **No Node or Python APIs**: no `require`, `module.exports`, `process.*`, `__dirname`, `fs`, `readline`, no npm packages.
2. **No direct network**: no `fetch`, `XMLHttpRequest`, `WebSocket`, axios. Only `ctx.getAll` / `ctx.mistGet` / `ctx.searchAll`.
3. **Read-only**: GET only. No POST/PUT/DELETE.
4. **No storage**: no `localStorage`, `sessionStorage`, `indexedDB`, `chrome.storage`, cookies.
5. **No `console.*`** — use `ctx.log`. **No `eval` / `new Function` / dynamic `import()`.**
6. **Imports**: only `../lib/*.js`, `../engine/*.js`, `../mist.js` — normally you need none.
7. **No token handling**: never prompt for, read from env, or hardcode a token or region. The toolbox supplies both.
8. **Do not write files**; return `sheets` and the toolbox builds the `.xlsx`.

## Conversion guidance

- Keep the original's API calls, row fields, column headers, column order, sorting and filename prefix.
- Terminal prompts and command-line flags become `params`. Hardcoded org/region choices go away (the toolbox supplies them).
- Replace hand-written pagination with `ctx.getAll` (Mist can return fewer rows than `limit` before the end; `getAll` handles it).
- Sequential per-site loops become `ctx.pool(ctx.POOL_LIMIT, ...)`, with a `try/catch` per site so one failure is logged and reported in `summary` rather than fatal. Call `ctx.progress` as sites finish.
- Spreadsheet styling code (header fills, freeze panes, autofilter, widths) is dropped — it is automatic.
- Export small pure helper functions with `export function` so they can be unit-tested.

## Output

Reply with **one complete JavaScript file and nothing else** — no explanation before or after,
no Markdown other than a single ```js fence. Choose a kebab-case filename and put it in a
first-line comment, e.g. `// mist-switch-report.js — converted from mist_switch_report.js`.

## A complete, working example tool

```js
// A complete, working Mist Toolbox tool to copy from.
//
// It counts the devices at every site from one org inventory call. Rename the
// file (e.g. my-report.js), change id / name / description, replace run(), and
// install it with the toolbox's "Manage tools" button.

export default {
  id: "device-count",
  name: "Device Count by Site",
  description: "How many access points, switches and gateways each site has, "
    + "from the org inventory, with a total row.",
  tag: "Mist API",
  needs: { mistToken: true, org: true },
  params: [
    {
      id: "connectedOnly",
      label: "Count connected devices only",
      type: "checkbox",
      default: false,
    },
  ],

  async run(ctx) {
    const { getAll, log } = ctx;
    log(`Org: ${ctx.orgName}`, "info");

    const sites = await getAll(`/orgs/${ctx.orgId}/sites`);
    const siteName = Object.fromEntries(sites.map((s) => [s.id, s.name || s.id]));

    const inventory = await getAll(`/orgs/${ctx.orgId}/inventory`);
    const counted = ctx.params.connectedOnly ? inventory.filter((d) => d.connected) : inventory;
    log(`${counted.length} device(s) counted of ${inventory.length} in inventory.`, "info");

    const bySite = new Map();
    for (const d of counted) {
      const key = d.site_id || "";
      const row = bySite.get(key) || { site: siteName[key] || "(unassigned)", ap: 0, switch: 0, gateway: 0 };
      if (d.type in row) row[d.type] += 1;
      bySite.set(key, row);
    }
    const rows = [...bySite.values()].sort((a, b) => a.site.localeCompare(b.site));
    rows.push({
      site: "Total",
      ap: rows.reduce((n, r) => n + r.ap, 0),
      switch: rows.reduce((n, r) => n + r.switch, 0),
      gateway: rows.reduce((n, r) => n + r.gateway, 0),
      __style: "bold",
    });

    const columns = [
      { header: "Site", key: "site" },
      { header: "Access Points", key: "ap" },
      { header: "Switches", key: "switch" },
      { header: "Gateways", key: "gateway" },
    ];

    log("Done.", "ok");
    return {
      summary: `${counted.length} device(s) across ${rows.length - 1} site(s)`,
      filename: ctx.stampedName("mist_device_count", ctx.orgName, "xlsx"),
      sheets: [ctx.xlsx.sheet("Devices by Site", columns, rows)],
      preview: { title: "Devices by Site", columns, rows },
    };
  },
};
```

--- PASTE YOUR SCRIPT BELOW THIS LINE ---

