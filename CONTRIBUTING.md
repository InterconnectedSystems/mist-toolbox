# Contributing a tool

The toolbox grows by people sharing the reports they wrote for themselves. Contributed tools live
in [`mist-toolbox/community/`](mist-toolbox/community/README.md). They are reviewed and tested
like any other code, but they are not built in: people install the ones they want with
**Manage tools → Install**.

## 1. Write the tool

A tool is one JavaScript file that default-exports a tool object. You don't have to write it by
hand:

- **With an AI assistant**: **Manage tools → Copy AI prompt**, paste it into any assistant, then
  add your script or a description of the report you want. The full walkthrough is in
  [ADDING_TOOLS.md](ADDING_TOOLS.md).
- **By hand**: start from [`tool-template.js`](mist-toolbox/docs/tool-template.js). The reference
  is the [authoring guide](mist-toolbox/docs/TOOL_GUIDE.md).

## 2. Try it in your own toolbox

Install it with **Manage tools → Install** and run it against your org. The installer runs the
same checks CI runs, so a tool that installs cleanly will usually pass.

## 3. Open a pull request

1. Fork this repository.
2. Add your file as `mist-toolbox/community/<tool-id>.js`. The filename must match the tool's
   `id`. For example, `id: "ap-uptime"` goes in `ap-uptime.js`.
3. Add one row for it to the table in
   [`mist-toolbox/community/README.md`](mist-toolbox/community/README.md), linking the file as
   `[ap-uptime.js](ap-uptime.js)`.
4. Optional: run `npm test` in `mist-toolbox/`. It needs Node 20 or later and no `npm install`.
5. Open the pull request and fill in the checklist.

One tool per pull request, please. If you're changing an existing community tool, say what
changed and why.

## The rules

CI enforces most of these, and a reviewer checks the rest:

| Rule | Why |
|---|---|
| Mist calls only through `ctx.getAll`, `ctx.searchAll`, `ctx.mistGet` | They only talk to the region the user picked |
| Read-only: GET only, no POST/PUT/DELETE | The toolbox never changes anyone's network |
| No `fetch`, `XMLHttpRequest`, `WebSocket` or other network access | The token must not leave the Mist API |
| No browser storage, cookies, `console.*`, `eval` or dynamic `import()` | Nothing is persisted; the extension's security policy blocks the rest |
| Imports only from `../lib/`, `../engine/` or `../mist.js` | There is no npm in the browser |
| A header comment listing every Mist endpoint the tool reads | Reviewers and users can see what it touches |
| **No real data**: no org or site IDs, tokens, hostnames, MACs, IPs or customer names, in the file or in the PR | The repository is public |

## Becoming a built-in tool

A community tool that many people use can be promoted to `mist-toolbox/tools/`. When that
happens, a maintainer adds tests (see `mist-toolbox/tests/` for examples) and the tool ships in
the next release.

## Licence

This repository is MIT-licensed (see [LICENSE](LICENSE)). By opening a pull request you agree
that your contribution is released under the same licence.
