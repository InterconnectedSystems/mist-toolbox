// Switch PSU Status, added as written: PSU classing, per-member health with the
// worst member deciding a VC, scope, and failing sites.

import { strict as assert } from "node:assert";
import test from "node:test";

import tool from "../tools/switch-psu-status.js";
import { sheetNamed, stubMist, testCtx } from "./helpers.mjs";

const SITES = [{ id: "s1", name: "HQ" }, { id: "s2", name: "Branch" }];
const psus = (...st) => st.map((status, i) => ({ name: `Power Supply ${i}`, status }));
const sw = (o) => ({ type: "switch", status: "connected", model: "EX4400-48P", ...o });

const routes = (o = {}) => ({
  "/orgs/org-1/sites": SITES,
  "/sites/s1/stats/devices": [
    sw({ name: "core", mac: "aabbcc000001", module_stat: [{ fpc_idx: 0, psus: psus("ok", "ok") }] }),
    sw({ name: "edge", mac: "aabbcc000002", module_stat: [{ fpc_idx: 0, psus: psus("OK", "absent") }] }),
    // VC: member 0 redundant, member 1 has a failed supply -> the switch is failed.
    sw({ name: "vc", mac: "aabbcc000003", module_stat: [
      { fpc_idx: 1, vc_role: "backup", serial: "B", psus: psus("Online", "Check") },
      { fpc_idx: 0, vc_role: "master", serial: "A", psus: psus("ok", "ok") },
    ] }),
    sw({ name: "dark", mac: "aabbcc000004", status: "disconnected", module_stat: [] }),
    { type: "ap", name: "not-a-switch" },
  ],
  "/sites/s2/stats/devices": [
    sw({ name: "br", mac: "aabbcc000005", module_stat: [{ fpc_idx: 0, psus: psus("ok", "weird") }] }),
  ],
  ...o,
});

const run = (params) => tool.run(testCtx({ params: { allSites: true, includeOffline: true, ...params } }));

test("all sites: each switch graded, worst VC member wins, failures sort first", async () => {
  stubMist(routes());
  const result = await run({});
  const rows = sheetNamed(result, "Switches").rows;
  const health = Object.fromEntries(rows.map((r) => [r.name, r.health]));
  assert.deepEqual(health, {
    core: "Redundant", edge: "Not redundant", vc: "PSU failed", dark: "No PSU data", br: "Not redundant",
  });
  assert.equal(rows[0].name, "vc", "failed switches lead the sheet");
  const vc = rows.find((r) => r.name === "vc");
  assert.equal(vc.members, 2);
  assert.equal(vc.detail, "FPC 0: Power Supply 0=ok, Power Supply 1=ok\nFPC 1: Power Supply 0=Online, Power Supply 1=Check");
  assert.equal(rows.find((r) => r.name === "edge").absent, 1);
  assert.equal(rows.find((r) => r.name === "br").unknown, 1);
  assert.ok(!rows.some((r) => r.name === "not-a-switch"));
  assert.match(result.summary, /^5 switch\(es\): 1 with a failed PSU, 2 not redundant, 1 redundant$/);
  assert.match(result.filename, /^mist_switch_psu_all_sites_Acme_Corp_/);
});

test("PSU sheet keeps the raw text and the class", async () => {
  stubMist(routes());
  const rows = sheetNamed(await run({}), "PSUs").rows;
  const check = rows.find((r) => r.raw === "Check");
  assert.equal(check.cls, "Failed");
  assert.equal(check.member, 1);
  assert.equal(check.role, "backup");
  assert.equal(check.__style, "red");
  assert.equal(rows.find((r) => r.raw === "weird").cls, "Unknown");
  assert.equal(rows.find((r) => r.raw === "absent").cls, "Empty slot");
});

test("By Site puts the site with a failure first", async () => {
  stubMist(routes());
  const rows = sheetNamed(await run({}), "By Site").rows;
  assert.deepEqual(rows.map((r) => r.site), ["HQ", "Branch"]);
  assert.deepEqual({ ...rows[0], __style: undefined },
    { site: "HQ", total: 4, failed: 1, single: 1, nodata: 1, redundant: 1, offline: 1, __style: undefined });
});

test("disconnected switches can be left out", async () => {
  stubMist(routes());
  const rows = sheetNamed(await run({ includeOffline: false }), "Switches").rows;
  assert.ok(!rows.some((r) => r.name === "dark"));
});

test("one site: only that site is queried", async () => {
  const calls = stubMist(routes());
  const result = await run({ allSites: false, siteId: "s2" });
  assert.deepEqual(sheetNamed(result, "Switches").rows.map((r) => r.name), ["br"]);
  assert.ok(!calls.some((c) => c.startsWith("/sites/s1/")));
  assert.match(result.filename, /^mist_switch_psu_Branch_Acme_Corp_/);
});

test("a failing site is listed, not fatal", async () => {
  stubMist(routes({ "/sites/s2/stats/devices": () => { throw new Error("boom"); } }));
  const result = await run({});
  assert.deepEqual(sheetNamed(result, "Failed Sites").rows.map((r) => r.site), ["Branch"]);
  assert.equal(sheetNamed(result, "Switches").rows.length, 4);
  assert.match(result.summary, /1 site\(s\) failed/);
});

test("no site picked is a clear error", async () => {
  stubMist(routes());
  await assert.rejects(run({ allSites: false }), /Pick a site/);
});
