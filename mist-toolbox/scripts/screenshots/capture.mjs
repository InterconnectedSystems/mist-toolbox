#!/usr/bin/env node
// Regenerates docs/screenshots/*.png: loads the extension into headless
// Chromium, answers every Mist and Conductor request from fixtures.mjs (all
// synthetic — the repo is public), runs each tool, and captures the page.
//
//   node --experimental-websocket scripts/screenshots/capture.mjs [path-to-chromium]
//
// The extension is copied to a scratch folder first, with the demo Conductor
// added to host_permissions so the SSR tool does not stop at the browser's
// permission prompt (which a headless run cannot click). The shipped manifest
// is never touched.

import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { cp, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { CONDUCTOR, ORG_ID, conductor, mist } from "./fixtures.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const outDir = join(root, "docs", "screenshots");
const chromium = process.argv[2] || "/usr/bin/chromium";
const PORT = 9333;
const WIDTH = 1280;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ---- Extension copy -----------------------------------------------------------

const work = await mkdtemp(join(tmpdir(), "mist-shots-"));
const extDir = join(work, "ext");
await cp(root, extDir, {
  recursive: true,
  filter: (src) => !/\/(node_modules|tests|\.git)(\/|$)/.test(src) && !src.includes("/docs/screenshots"),
});
const manifestPath = join(extDir, "manifest.json");
const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
manifest.host_permissions.push(`${CONDUCTOR}/*`);
await writeFile(manifestPath, JSON.stringify(manifest, null, 2));

// Chrome's id for an unpacked extension: sha256 of its path, hex mapped to a-p.
const extId = [...createHash("sha256").update(extDir).digest("hex").slice(0, 32)]
  .map((c) => String.fromCharCode(97 + parseInt(c, 16))).join("");
const extUrl = (p) => `chrome-extension://${extId}/${p}`;

// ---- Browser ----------------------------------------------------------------

const browser = spawn(chromium, [
  "--headless=new", "--no-sandbox", "--disable-gpu", "--hide-scrollbars",
  `--remote-debugging-port=${PORT}`, `--user-data-dir=${join(work, "profile")}`,
  `--disable-extensions-except=${extDir}`, `--load-extension=${extDir}`,
  "--force-color-profile=srgb", `--window-size=${WIDTH},900`, "about:blank",
], { stdio: ["ignore", "ignore", "pipe"] });

let wsUrl;
for (let i = 0; i < 50 && !wsUrl; i += 1) {
  await sleep(200);
  wsUrl = await fetch(`http://127.0.0.1:${PORT}/json/version`).then((r) => r.json()).then((j) => j.webSocketDebuggerUrl, () => null);
}
if (!wsUrl) throw new Error("Chromium did not start");

const ws = new WebSocket(wsUrl);
await new Promise((r, j) => { ws.onopen = r; ws.onerror = j; });
let seq = 0;
const pending = new Map();
const listeners = [];
ws.onmessage = (ev) => {
  const msg = JSON.parse(ev.data);
  if (msg.id && pending.has(msg.id)) {
    const { resolve: ok, reject } = pending.get(msg.id);
    pending.delete(msg.id);
    if (msg.error) reject(new Error(`${msg.error.message} ${msg.error.data || ""}`)); else ok(msg.result);
  } else if (msg.method) {
    for (const l of listeners) l(msg);
  }
};
const send = (method, params = {}, sessionId) => new Promise((ok, reject) => {
  const id = ++seq;
  pending.set(id, { resolve: ok, reject });
  ws.send(JSON.stringify({ id, method, params, ...(sessionId ? { sessionId } : {}) }));
});

// Give the service worker a moment to register the extension.
await sleep(1500);
const { targetId } = await send("Target.createTarget", { url: "about:blank" });
const { sessionId: s } = await send("Target.attachToTarget", { targetId, flatten: true });
const cmd = (method, params) => send(method, params, s);

await cmd("Page.enable");
await cmd("Runtime.enable");
await cmd("Emulation.setDeviceMetricsOverride", { width: WIDTH, height: 900, deviceScaleFactor: 1, mobile: false });
await cmd("Emulation.setEmulatedMedia", { features: [{ name: "prefers-color-scheme", value: "light" }] });
await send("Browser.setDownloadBehavior", { behavior: "allow", downloadPath: join(work, "downloads") });

// ---- Fixture network ----------------------------------------------------------

let ssrPhase = "pre";
const served = [];
await cmd("Fetch.enable", { patterns: [{ urlPattern: "https://api.*" }, { urlPattern: `${CONDUCTOR}/*` }] });
listeners.push(async (msg) => {
  if (msg.method !== "Fetch.requestPaused" || msg.sessionId !== s) return;
  const { requestId, request } = msg.params;
  const u = new URL(request.url);
  let hit = null;
  if (u.origin === CONDUCTOR) hit = conductor(request.method, u.pathname, ssrPhase);
  else if (/(^|\.)mist(-federal)?\.com$/.test(u.hostname)) hit = mist(u.pathname.replace(/^\/api\/v1/, ""), u.searchParams);
  served.push(`${request.method} ${u.pathname}${hit ? "" : " (404)"}`);
  const body = hit ? JSON.stringify(hit.body) : "";
  const total = hit && Array.isArray(hit.body) ? String(hit.body.length) : null;
  await cmd("Fetch.fulfillRequest", {
    requestId,
    responseCode: hit ? 200 : 404,
    responseHeaders: [
      { name: "Content-Type", value: "application/json" },
      { name: "Access-Control-Allow-Origin", value: "*" },
      ...(total ? [{ name: "X-Page-Total", value: total }] : []),
    ],
    body: Buffer.from(body).toString("base64"),
  }).catch(() => {});
});

// ---- Page helpers -------------------------------------------------------------

async function evaluate(expression) {
  const r = await cmd("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true });
  if (r.exceptionDetails) throw new Error(`${expression.slice(0, 80)}: ${r.exceptionDetails.exception?.description || r.exceptionDetails.text}`);
  return r.result.value;
}

async function waitFor(expression, label, timeout = 30000) {
  const end = Date.now() + timeout;
  while (Date.now() < end) {
    if (await evaluate(`!!(${expression})`).catch(() => false)) return;
    await sleep(150);
  }
  throw new Error(`Timed out waiting for ${label}`);
}

async function go(url) {
  await cmd("Page.navigate", { url });
  await waitFor("document.readyState === 'complete'", `load ${url}`);
  await sleep(400);
}

const click = (sel) => evaluate(`document.querySelector(${JSON.stringify(sel)}).click()`);
const setValue = (sel, v) => evaluate(`(() => { const el = document.querySelector(${JSON.stringify(sel)});
  el.value = ${JSON.stringify(v)}; el.dispatchEvent(new Event("input", {bubbles:true})); el.dispatchEvent(new Event("change", {bubbles:true})); })()`);
const setChecked = (sel, v) => evaluate(`(() => { const el = document.querySelector(${JSON.stringify(sel)});
  el.checked = ${v}; el.dispatchEvent(new Event("change", {bubbles:true})); })()`);

const shots = [];
/**
 * Capture the page from the top (so the sticky header stays where it
 * belongs), or just the region spanned by `only` selectors.
 */
async function shot(name, caption, only) {
  await evaluate("window.scrollTo(0, 0)");
  await sleep(300);
  let clip;
  if (only) {
    clip = await evaluate(`(() => {
      const rs = ${JSON.stringify(only)}.map((q) => document.querySelector(q))
        .filter((el) => el && el.offsetParent).map((el) => el.getBoundingClientRect());
      const top = Math.min(...rs.map((r) => r.top + scrollY)) - 16;
      const bottom = Math.max(...rs.map((r) => r.bottom + scrollY)) + 16;
      return { x: 0, y: Math.max(0, top), width: ${WIDTH}, height: Math.min(bottom - top, 4000), scale: 1 };
    })()`);
  } else {
    const { cssContentSize } = await cmd("Page.getLayoutMetrics");
    clip = { x: 0, y: 0, width: WIDTH, height: Math.min(Math.ceil(cssContentSize.height), 4000), scale: 1 };
  }
  const { data } = await cmd("Page.captureScreenshot", { format: "png", captureBeyondViewport: true, clip });
  await writeFile(join(outDir, `${name}.png`), Buffer.from(data, "base64"));
  shots.push({ name, caption });
  process.stdout.write(`  ${name}.png  ${caption}\n`);
}

async function runTool(id, { params = {}, single } = {}) {
  await click("#btnHome").catch(() => {});
  await waitFor(`document.querySelector('[data-tool="${id}"]')`, `card ${id}`);
  await click(`[data-tool="${id}"]`);
  await waitFor("!document.getElementById('viewTool').classList.contains('hidden')", `${id} view`);
  if (single) {
    await waitFor(`document.querySelector('#p_siteId option[value="${single}"]')`, "site list");
    await setChecked("#p_allSites", false);
    await setValue("#p_siteId", single);
  }
  for (const [k, v] of Object.entries(params)) {
    if (typeof v === "boolean") await setChecked(`#p_${k}`, v); else await setValue(`#p_${k}`, v);
  }
  await click("#btnRun");
  await waitFor("!document.getElementById('resultCard').classList.contains('hidden') "
    + "&& !document.getElementById('btnRun').disabled", `${id} result`);
  await evaluate("window.scrollTo(0, 0)");
}

// ---- The tour -----------------------------------------------------------------

await rm(outDir, { recursive: true, force: true });
await mkdir(outDir, { recursive: true });

try {
  await go(extUrl("toolbox.html"));
  await shot("01-home-signed-out", "Tool menu before a token is validated");

  await setValue("#token", "demo-token-not-a-real-credential");
  await click("#btnConnect");
  await waitFor("!document.getElementById('orgRow').classList.contains('hidden')", "org list");
  await shot("02-home", "Tool menu with each tool's level (Site · Org, Site · Client, SSR Conductor)");

  await runTool("ssid-report");
  await shot("03-ssid-report", "SSID Report — every site in the org");

  await runTool("switch-report", { single: "site-hq" });
  await shot("04-switch-report-single-site", "Switch Software Report for one site (All sites unticked, Site picked)");

  await runTool("switch-configs");
  await shot("05-switch-config-export", "Switch Config Export — one .zip with a folder per site");

  await runTool("site-alarms", { params: { duration: "7d" } });
  await shot("06-site-alarms", "Site Alarms — past 7 days, all sites");

  await runTool("wifi-clients");
  await shot("07-wifi-clients", "Wi-Fi Clients Export");

  await runTool("ip-blocks");
  await shot("08-ip-blocks", "IP Blocks / IRB Report — duplicate subnet flagged across sites");

  await runTool("port-inventory");
  await shot("09-port-inventory", "Switch Port Inventory");

  // SSR Pre/Post: connect, pre-check, change, post-check.
  await click("#btnHome");
  await click('[data-tool="ssr-pre-post"]');
  await waitFor("document.querySelector('#ssrUrl')", "SSR form");
  await setValue("#ssrUrl", CONDUCTOR);
  await setValue("#ssrUser", "demo");
  await setValue("#ssrPass", "demo-password");
  await click("#ssrConnect");
  await waitFor("!document.getElementById('ssrScopeCard').classList.contains('hidden')", "SSR scope");
  ssrPhase = "pre";
  await click("#ssrPre");
  await waitFor("!document.getElementById('ssrPost').disabled", "pre-check");
  await shot("10-ssr-pre-check", "SSR Pre/Post Check — pre-check output, laid out like the CLI");
  ssrPhase = "post";
  await click("#ssrPost");
  await waitFor("!document.getElementById('ssrDiffCard').classList.contains('hidden') "
    + "&& !document.getElementById('ssrPre').disabled", "post-check");
  await shot("11-ssr-post-highlighted", "SSR post-check — changed fields highlighted in place", ["#ssrOutCard"]);
  await setValue("#ssrOutMode", "side");
  await shot("12-ssr-side-by-side", "SSR post-check — pre and post side by side", ["#ssrOutCard"]);
  await shot("12b-ssr-diff-table", "SSR post-check — every changed value, exportable to CSV", ["#ssrDiffCard"]);

  // Disconnect Console has its own sample mode.
  await go(extUrl("console.html#demo"));
  await waitFor("document.body.innerText.includes('sample')", "console demo", 20000);
  await shot("13-disconnect-console", "Disconnect Console — built-in sample investigation");

  // Manage tools: the panel, with a Node script rejected before install.
  await go(extUrl("toolbox.html"));
  await click("#btnAddTool");
  const { root: doc } = await cmd("DOM.getDocument", {});
  const { nodeId } = await cmd("DOM.querySelector", { nodeId: doc.nodeId, selector: "#toolFile" });
  await cmd("DOM.setFileInputFiles", { nodeId, files: [resolve(root, "..", "mist_switch_report.js")] });
  await waitFor("document.getElementById('checkOut').innerText.includes('Node.js')", "upload check");
  await shot("14-manage-tools", "Manage tools — a Node script is explained, not installed", ["#addPanel"]);
} catch (e) {
  process.stderr.write(`\n${e.stack}\nRequests served:\n  ${served.slice(-25).join("\n  ")}\n`);
  process.exitCode = 1;
} finally {
  ws.close();
  browser.kill();
  await sleep(300);
  await rm(work, { recursive: true, force: true });
}

if (!process.exitCode) {
  const md = shots.map((s) => `### ${s.caption}\n\n![${s.caption}](${s.name}.png)\n`).join("\n");
  await writeFile(join(outDir, "README.md"), `# Mist Toolbox screenshots\n\nGenerated by \`scripts/screenshots/capture.mjs\` against synthetic data (\`fixtures.mjs\`) — no real org.\n\n${md}`);
  process.stdout.write(`\n${shots.length} screenshots in docs/screenshots/ (org ${ORG_ID}, ${served.length} requests answered from fixtures)\n`);
}
