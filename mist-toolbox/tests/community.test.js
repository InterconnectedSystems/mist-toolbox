// Contributed tools in community/ must pass the same gate the Install panel
// applies, load as valid tools, and be listed in the community README. CI runs
// this on every pull request, so a contribution fails by name before review.

import { strict as assert } from "node:assert";
import { readFile, readdir } from "node:fs/promises";
import test from "node:test";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { checkToolSource, toolFilename } from "../lib/toolcheck.js";
import { BUILTIN_TOOLS, validateTool } from "../tools/registry.js";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const dir = join(root, "community");

const files = (await readdir(dir)).filter((f) => f.endsWith(".js")).sort();

async function builtinIds() {
  const ids = new Set();
  for (const file of BUILTIN_TOOLS) ids.add((await import(pathToFileURL(join(root, "tools", file)).href)).default.id);
  return ids;
}

test("every community tool passes the Install checks and loads as a valid tool", async () => {
  const taken = await builtinIds();
  for (const file of files) {
    const src = await readFile(join(dir, file), "utf8");
    const { problems } = checkToolSource(src, file);
    assert.deepEqual(problems, [], `community/${file}`);

    const tool = validateTool((await import(pathToFileURL(join(dir, file)).href)).default, file);
    assert.equal(file, toolFilename(tool.id), `community/${file}: name the file after its id, ${toolFilename(tool.id)}`);
    assert.ok(!taken.has(tool.id), `community/${file}: id "${tool.id}" is already used by another tool`);
    taken.add(tool.id);
    assert.ok(tool.description.length > 30, `community/${file}: description should actually describe the tool`);
  }
});

test("every community tool is listed in community/README.md", async () => {
  const readme = await readFile(join(dir, "README.md"), "utf8");
  const missing = files.filter((f) => !readme.includes(`(${f})`));
  assert.deepEqual(missing, [], `add a row linking each file, e.g. [${missing[0]}](${missing[0]})`);
});
