// Tool discovery.
//
// The whole modularity story lives here: tools.json lists filenames, each file
// default-exports one tool object, and the shell renders whatever loads. A new
// tool is a file drop plus a line in tools.json — no change to the shell, no
// build step. `npm run scan` regenerates tools.json from the directory so even
// that line is optional.
//
// Dynamic import() of a packaged file is permitted under the manifest's
// script-src 'self', so no CSP change is needed to make this work.

const TOOL_TYPES = new Set(["text", "password", "number", "checkbox", "select", "textarea", "file"]);

/**
 * Check a module exports something the shell can actually drive, and say
 * precisely what is wrong if not. A bad tool must fail by name rather than
 * breaking the menu for every other tool.
 */
export function validateTool(tool, file) {
  const where = `tools/${file}`;
  if (!tool || typeof tool !== "object") throw new Error(`${where}: no default export object.`);
  for (const key of ["id", "name", "description"]) {
    if (typeof tool[key] !== "string" || !tool[key].trim()) {
      throw new Error(`${where}: "${key}" must be a non-empty string.`);
    }
  }
  if (!/^[a-z0-9-]+$/.test(tool.id)) {
    throw new Error(`${where}: "id" must be lowercase letters, digits and dashes.`);
  }
  if (typeof tool.run !== "function") throw new Error(`${where}: "run" must be a function.`);
  if (tool.scope !== undefined && tool.scope !== "site") {
    throw new Error(`${where}: "scope" can only be "site".`);
  }
  if (tool.scope === "site") {
    const own = (tool.params || []).find((p) => p && (p.id === "allSites" || p.id === "siteId"));
    if (own) {
      throw new Error(`${where}: param "${own.id}" is drawn by the toolbox for scope: "site" tools — remove it.`);
    }
  }
  for (const p of tool.params || []) {
    if (!p || typeof p.id !== "string" || !p.id) throw new Error(`${where}: every param needs an "id".`);
    if (p.type && !TOOL_TYPES.has(p.type)) {
      throw new Error(`${where}: param "${p.id}" has unknown type "${p.type}".`);
    }
  }
  return tool;
}

/**
 * The tools that ship with the extension. The Add tool panel will not replace
 * or remove these; tests/registry.test.js keeps the list honest.
 */
export const BUILTIN_TOOLS = [
  "disconnect-console.js",
  "ip-blocks.js",
  "port-inventory.js",
  "ssid-report.js",
  "site-alarms.js",
  "ssr-pre-post.js",
  "switch-configs.js",
  "switch-report.js",
  "wifi-clients.js",
];

/**
 * Import and validate one tool file. `bust` defeats the module cache, so a
 * tool that was just overwritten on disk is actually re-read.
 */
export async function loadOne(file, bust) {
  if (typeof file !== "string" || !/^[\w.-]+\.js$/.test(file)) {
    throw new Error("not a plain .js filename");
  }
  const url = chrome.runtime.getURL(`tools/${file}`) + (bust ? `?v=${bust}` : "");
  return { ...validateTool((await import(url)).default, file), __file: file };
}

/**
 * Load every tool named in tools.json.
 * @returns {Promise<{tools: Array<object>, errors: Array<{file: string, message: string}>}>}
 */
export async function loadTools({ bust } = {}) {
  const tools = [];
  const errors = [];
  let list;
  try {
    // no-store: tools.json changes on disk when a tool is added from the UI.
    const res = await fetch(chrome.runtime.getURL("tools/tools.json"), { cache: "no-store" });
    list = await res.json();
    if (!Array.isArray(list)) throw new Error("tools.json must contain an array of filenames.");
  } catch (e) {
    return { tools, errors: [{ file: "tools.json", message: e.message }] };
  }

  for (const file of list) {
    try {
      const tool = await loadOne(file, bust);
      if (tools.some((t) => t.id === tool.id)) throw new Error(`duplicate tool id "${tool.id}"`);
      tools.push(tool);
    } catch (e) {
      errors.push({ file: String(file), message: e.message });
    }
  }
  return { tools, errors };
}
