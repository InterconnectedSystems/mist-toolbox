// The authoring docs describe the real ctx and embed the real template, so they
// cannot quietly go stale.

import { strict as assert } from "node:assert";
import { readFile, readdir } from "node:fs/promises";
import test from "node:test";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { BUILTIN_TOOLS } from "../tools/registry.js";
import { testCtx } from "./helpers.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (p) => readFile(join(root, p), "utf8");

test("TOOL_GUIDE.md documents every ctx key the shell provides, and no others", async () => {
  const shell = await read("toolbox.js");
  const body = shell.slice(shell.indexOf("function buildCtx"), shell.indexOf("async function run()"));
  const ret = body.slice(body.indexOf("return {"));
  const keys = new Set();
  for (const line of ret.split("\n")) {
    const t = line.replace(/\/\/.*$/, "").trim();
    if (!t || t.startsWith("return") || t.startsWith("}")) continue;
    const m = t.match(/^(\w+):/);
    if (m) keys.add(m[1]);
    else for (const k of t.split(",").map((s) => s.trim()).filter(Boolean)) keys.add(k);
  }
  const guide = await read("docs/TOOL_GUIDE.md");
  const documented = new Set([...guide.matchAll(/^\| `ctx\.(\w+)`/gm)].map((m) => m[1]));
  assert.deepEqual([...documented].sort(), [...keys].sort());
  // The test ctx must offer the same surface, minus the DOM mount point.
  const test = new Set(Object.keys(testCtx()));
  for (const k of keys) if (k !== "mount") assert.ok(test.has(k), `testCtx lacks ${k}`);
});

test("TOOL_PROMPT.md embeds the current template verbatim", async () => {
  const prompt = await read("docs/TOOL_PROMPT.md");
  const template = (await read("docs/tool-template.js")).trimEnd();
  assert.ok(prompt.includes(template), "regenerate the example in TOOL_PROMPT.md from docs/tool-template.js");
  assert.match(prompt, /PASTE YOUR SCRIPT BELOW/);
});

test("BUILTIN_TOOLS is exactly the shipped tools", async () => {
  const onDisk = (await readdir(join(root, "tools")))
    .filter((f) => f.endsWith(".js") && f !== "registry.js").sort();
  assert.deepEqual([...BUILTIN_TOOLS].sort(), onDisk);
});

test("the docs viewer only opens the shipped docs", async () => {
  const viewer = await read("docs/view.js");
  for (const doc of ["TOOL_GUIDE.md", "TOOL_PROMPT.md", "tool-template.js"]) {
    assert.ok(viewer.includes(`"${doc}"`));
    await read(`docs/${doc}`);
  }
});
