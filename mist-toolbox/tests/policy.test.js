// The security posture, enforced mechanically.
//
// Rewritten from the disconnect console's tests/token-hygiene.test.js. Three
// rules changed deliberately when the console became a toolbox, and the reasons
// are recorded here so a future reader does not "fix" them back:
//
//   * host_permissions grew from 9 to 13 Mist regions, because the Python
//     scripts between them knew regions the console did not.
//   * optional_host_permissions is now declared, for the SSR Conductor, whose
//     host only the user knows. Nothing is granted until they connect.
//   * GET-only is now scoped rather than global: the Mist tools stay GET-only,
//     and POST is confined to the SSR tool, which needs it for /login and for
//     the one session-count endpoint the Conductor only answers to POST.
//
// Everything that protects the credential is unchanged, including the absolute
// ban on persisting anything.

import { strict as assert } from "node:assert";
import { readFile, readdir } from "node:fs/promises";
import test from "node:test";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

import { MIST_HOSTS } from "../engine/util.js";
import { POLICY } from "../lib/toolcheck.js";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

/** Everything that actually ships inside the extension package. */
const SKIP_DIRS = new Set(["tests", "scripts", "node_modules", ".git"]);
const SKIP_FILES = new Set(["package.json", "package-lock.json", "README.md"]);

async function shipped(ext) {
  const out = [];
  async function walk(dir) {
    for (const e of await readdir(dir, { withFileTypes: true })) {
      if (e.isDirectory()) {
        if (!SKIP_DIRS.has(e.name)) await walk(join(dir, e.name));
      } else if (!SKIP_FILES.has(e.name) && (!ext || ext.some((x) => e.name.endsWith(x)))) {
        out.push(join(dir, e.name));
      }
    }
  }
  await walk(root);
  return out;
}

const read = async (f) => ({ path: relative(root, f), text: await readFile(f, "utf8") });

test("nothing persists: no storage API anywhere in shipped code", async () => {
  // lib/toolcheck.js holds these patterns to check uploaded tools, so it
  // necessarily contains the words as text; it is the one file excused.
  for (const f of await shipped([".js", ".html", ".json", ".css"])) {
    const { path, text } = await read(f);
    if (path === "lib/toolcheck.js") continue;
    const banned = POLICY.storage;
    assert.ok(!banned.test(text), `${path} uses a storage API — credentials must never be persisted`);
  }
});

test("no credential can cross to the service worker", async () => {
  const banned = POLICY.serviceWorker;
  for (const f of await shipped([".js", ".html"])) {
    const { path, text } = await read(f);
    assert.ok(!banned.test(text), `${path} messages the service worker; the token must stay in the page`);
  }
});

test("no console.* in shipped code", async () => {
  // Kept absolute by writing the xlsx layer rather than vendoring a bundle.
  const banned = POLICY.console;
  for (const f of await shipped([".js"])) {
    const { path, text } = await read(f);
    assert.ok(!banned.test(text), `${path} logs to the console`);
  }
});

test("POST is confined to the SSR tool", async () => {
  const ALLOWED = new Set(["tools/ssr-pre-post.js"]);
  const post = POLICY.post;
  for (const f of await shipped([".js"])) {
    const { path, text } = await read(f);
    if (ALLOWED.has(path)) continue;
    assert.ok(!post.test(text), `${path} issues a POST; Mist tools are read-only GETs`);
  }
});

test("mist.js keeps one fetch, with the allowlist and HTTPS checks on it", async () => {
  const text = await readFile(join(root, "mist.js"), "utf8");
  assert.equal((text.match(/await fetch\(/g) || []).length, 1,
    "one fetch only — it is the enforcement point for the host allowlist");
  assert.ok(text.includes("MIST_HOSTS.includes(host)"), "host allowlist check missing");
  assert.ok(text.includes('url.protocol !== "https:"'), "HTTPS check missing");
  assert.ok(text.includes('credentials: "omit"'), "cookies must never ride along");
});

test("manifest declares no permissions and the exact CSP", async () => {
  const m = JSON.parse(await readFile(join(root, "manifest.json"), "utf8"));
  assert.equal(m.permissions, undefined, "no permissions array: downloads use a Blob anchor");
  assert.equal(m.content_scripts, undefined, "no content scripts");
  assert.equal(m.web_accessible_resources, undefined, "nothing exposed to web pages");
  assert.equal(m.content_security_policy.extension_pages, "script-src 'self'; object-src 'self'");
  assert.equal(m.action.default_popup, undefined, "the action opens a tab, not a popup");
  assert.deepEqual(m.optional_host_permissions, ["https://*/*"],
    "the SSR Conductor host is requested at runtime, not granted up front");
});

test("host_permissions matches MIST_HOSTS exactly, in order", async () => {
  const m = JSON.parse(await readFile(join(root, "manifest.json"), "utf8"));
  assert.deepEqual(m.host_permissions, MIST_HOSTS.map((h) => `https://${h}/*`));
  assert.equal(MIST_HOSTS.length, 13);
  assert.ok(MIST_HOSTS.includes("api.us.mist-federal.com"), "the US Gov region came from mist_ip_blocks.py");
});

test("the credential bar is not a form, so no password manager offers to save the token", async () => {
  const html = await readFile(join(root, "toolbox.html"), "utf8");
  const bar = html.slice(html.indexOf('id="formSession"'), html.indexOf("</section>"));
  assert.ok(!/<form/i.test(bar), "the credential bar must not be a <form>");
  assert.ok(/id="btnConnect"[^>]*type="button"/.test(html), "btnConnect must be type=button");
  assert.ok(/id="token"[^>]*type="password"/.test(html), "the token field must be type=password");
  assert.ok(/id="token"[^>]*autocomplete="new-password"/.test(html));
});

test("every shipped page loads only local scripts", async () => {
  for (const f of await shipped([".html"])) {
    const { path, text } = await read(f);
    for (const m of text.matchAll(/<(?:script|link)[^>]*(?:src|href)="([^"]+)"/g)) {
      assert.ok(!/^(https?:)?\/\//.test(m[1]), `${path} loads ${m[1]} off-origin`);
    }
  }
});
