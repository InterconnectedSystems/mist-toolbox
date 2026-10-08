// Synthetic Mist and SSR Conductor responses for the README screenshots.
//
// Everything here is made up: "Demo Org", example.com names, documentation
// and RFC 1918 addresses, locally administered MACs (02:…). No real org data
// ever reaches a screenshot, which matters because the repo is public.

export const ORG_ID = "demo-org";
export const CONDUCTOR = "https://conductor.example.net";

const SITES = [
  { id: "site-hq", name: "HQ - Toronto", address: "100 Example Ave, Toronto ON", country_code: "CA", timezone: "America/Toronto" },
  { id: "site-ott", name: "Branch - Ottawa", address: "20 Sample St, Ottawa ON", country_code: "CA", timezone: "America/Toronto" },
  { id: "site-mtl", name: "Warehouse - Montreal", address: "5 Demo Rd, Montreal QC", country_code: "CA", timezone: "America/Toronto" },
];

const NOW = 1760000000; // fixed, so every regeneration matches
const mac = (n) => `020000${n.toString(16).padStart(6, "0")}`;

// ---- Switches ---------------------------------------------------------------

const SWITCHES = [
  { id: "dev-core", site: "site-hq", name: "hq-core", model: "EX4400-48P", serial: "DEMO4400A1", mac: mac(0x101), version: "23.4R2-S3", status: "connected", ip: "10.10.0.2",
    vc: [{ mac: mac(0x102), serial: "DEMO4400A2" }] },
  { id: "dev-idf1", site: "site-hq", name: "hq-idf-1", model: "EX2300-48P", serial: "DEMO2300B1", mac: mac(0x111), version: "22.4R3-S2", status: "connected", ip: "10.10.0.11" },
  { id: "dev-idf2", site: "site-hq", name: "hq-idf-2", model: "EX2300-48P", serial: "DEMO2300B2", mac: mac(0x112), version: "22.4R3-S2", status: "connected", ip: "10.10.0.12" },
  { id: "dev-ott", site: "site-ott", name: "ott-sw1", model: "EX4100-24P", serial: "DEMO4100C1", mac: mac(0x201), version: "23.4R2-S3", status: "connected", ip: "10.20.0.2" },
  { id: "dev-mtl", site: "site-mtl", name: "mtl-sw1", model: "EX2300-C-12P", serial: "DEMO2300D1", mac: mac(0x301), version: "21.4R3-S5", status: "disconnected", ip: "10.30.0.2" },
];

const IRB = {
  "dev-core": [["data", 10, "10.10.10.1/24"], ["voice", 20, "10.10.20.1/24"], ["printers", 30, "10.10.30.1/24"], ["guest", 99, "192.168.99.1/24"]],
  "dev-ott": [["data", 10, "10.20.10.1/24"], ["voice", 20, "10.20.20.1/24"]],
  // Deliberately reuses HQ's printer subnet, so the report flags a duplicate.
  "dev-mtl": [["data", 10, "10.30.10.1/24"], ["printers", 30, "10.10.30.1/24"]],
};

function configCmd(sw) {
  const lines = [
    `set system host-name ${sw.name}`,
    "set system time-zone America/Toronto",
    "set system name-server 192.0.2.53",
    "set snmp location \"" + SITES.find((s) => s.id === sw.site).name + "\"",
  ];
  for (const [name, vlan, addr] of IRB[sw.id] || []) {
    lines.push(`set vlans ${name} vlan-id ${vlan}`);
    lines.push(`set vlans ${name} l3-interface irb.${vlan}`);
    lines.push(`set interfaces irb unit ${vlan} description "${name} gateway"`);
    lines.push(`set interfaces irb unit ${vlan} family inet address ${addr}`);
  }
  for (let p = 0; p < 4; p += 1) {
    lines.push(`set interfaces ge-0/0/${p} unit 0 family ethernet-switching interface-mode access`);
    lines.push(`set interfaces ge-0/0/${p} unit 0 family ethernet-switching vlan members data`);
  }
  lines.push("set interfaces ge-0/0/47 unit 0 family ethernet-switching interface-mode trunk");
  lines.push("set protocols lldp interface all");
  lines.push("set routing-options static route 0.0.0.0/0 next-hop " + (sw.ip.replace(/\.\d+$/, ".1")));
  return lines;
}

function switchStats(sw) {
  const ports = [];
  for (let p = 0; p < 8; p += 1) {
    const up = !(p === 5 || (sw.status !== "connected"));
    ports.push({
      port_id: `ge-0/0/${p}`, up, speed: up ? (p === 0 ? 10000 : 1000) : 0, full_duplex: up,
      poe_on: up && p > 0 && p < 5, power_draw: up && p > 0 && p < 5 ? (6.2 + p * 1.7).toFixed(1) : "",
      neighbor_system_name: up && p > 0 && p < 4 ? `ap-${sw.name}-${p}` : "",
      neighbor_port_desc: up && p > 0 && p < 4 ? "eth0" : "",
    });
  }
  const base = {
    id: sw.id, mac: sw.mac, name: sw.name, model: sw.model, serial: sw.serial, version: sw.version,
    status: sw.status, ip: sw.ip, site_id: sw.site, type: "switch",
    uptime: sw.status === "connected" ? 1209600 + sw.mac.length * 3600 : 0,
    last_seen: NOW - (sw.status === "connected" ? 30 : 86400),
    ports,
  };
  if (sw.vc) {
    base.module_stat = [
      { fpc_idx: 0, vc_role: "master", serial: sw.serial, version: sw.version, mac: sw.mac },
      ...sw.vc.map((m, i) => ({ fpc_idx: i + 1, vc_role: "backup", serial: m.serial, version: sw.version, mac: m.mac })),
    ];
  }
  return base;
}

function inventory() {
  const rows = [];
  for (const sw of SWITCHES) {
    rows.push({ id: sw.id, mac: sw.mac, name: sw.name, model: sw.model, serial: sw.serial, site_id: sw.site,
      connected: sw.status === "connected", type: "switch", vc_mac: sw.vc ? sw.mac : undefined });
    for (const m of sw.vc || []) {
      rows.push({ mac: m.mac, serial: m.serial, model: sw.model, site_id: sw.site, vc_mac: sw.mac,
        connected: true, type: "switch" });
    }
  }
  return rows;
}

// Access points and gateways, for tools that read the whole inventory.
const OTHER_DEVICES = [
  ...Array.from({ length: 14 }, (_, i) => ({ type: "ap", mac: mac(0x600 + i), model: "AP45", site_id: "site-hq", connected: i !== 9 })),
  ...Array.from({ length: 5 }, (_, i) => ({ type: "ap", mac: mac(0x700 + i), model: "AP34", site_id: "site-ott", connected: true })),
  ...Array.from({ length: 3 }, (_, i) => ({ type: "ap", mac: mac(0x800 + i), model: "AP24", site_id: "site-mtl", connected: i !== 2 })),
  { type: "gateway", mac: mac(0x150), model: "SRX320", site_id: "site-hq", connected: true },
  { type: "gateway", mac: mac(0x250), model: "SSR120", site_id: "site-ott", connected: true },
  { type: "ap", mac: mac(0x999), model: "AP45", connected: false },
];

const PORT_USAGES = {
  access: { mode: "access", port_network: "data", poe_disabled: false },
  ap: { mode: "trunk", port_network: "data", networks: ["data", "voice", "guest"] },
  uplink: { mode: "trunk", all_networks: true },
};

function siteDevice(sw) {
  return {
    id: sw.id, mac: sw.mac, name: sw.name, model: sw.model, serial: sw.serial, site_id: sw.site, type: "switch",
    port_config: { "ge-0/0/0": { usage: "uplink" }, "ge-0/0/1-3": { usage: "ap" }, "ge-0/0/4-7": { usage: "access" } },
    port_usages: PORT_USAGES,
  };
}

// ---- Wireless ---------------------------------------------------------------

const TEMPLATES = [{ id: "tpl-corp", name: "Corporate WLANs" }];

const WLANS = {
  "site-hq": [
    { id: "w-corp", ssid: "DemoCorp", enabled: true, auth: { type: "eap", pairwise: ["wpa2-ccmp", "wpa3"] }, vlan_enabled: true, vlan_id: 10, bands: ["5", "6"], interface: "all", template_id: "tpl-corp" },
    { id: "w-guest", ssid: "DemoGuest", enabled: true, auth: { type: "open" }, vlan_enabled: true, vlan_id: 99, bands: ["24", "5"], interface: "all", template_id: "tpl-corp" },
    { id: "w-voice", ssid: "DemoVoice", enabled: true, hide_ssid: true, auth: { type: "psk", pairwise: ["wpa2-ccmp"] }, vlan_enabled: true, vlan_id: 20, bands: ["5"], interface: "all", site_id: "site-hq" },
  ],
  "site-ott": [
    { id: "w-corp", ssid: "DemoCorp", enabled: true, auth: { type: "eap", pairwise: ["wpa2-ccmp", "wpa3"] }, vlan_enabled: true, vlan_id: 10, bands: ["5", "6"], interface: "all", template_id: "tpl-corp" },
    { id: "w-guest", ssid: "DemoGuest", enabled: true, auth: { type: "open" }, vlan_enabled: true, vlan_id: 99, bands: ["24", "5"], interface: "all", template_id: "tpl-corp" },
  ],
  "site-mtl": [
    { id: "w-corp", ssid: "DemoCorp", enabled: true, auth: { type: "eap", pairwise: ["wpa2-ccmp"] }, vlan_enabled: true, vlan_id: 10, bands: ["5"], interface: "all", template_id: "tpl-corp" },
    { id: "w-scan", ssid: "DemoScanners", enabled: false, auth: { type: "psk", pairwise: ["wpa2-ccmp"] }, vlan_enabled: false, band: "24", interface: "all", site_id: "site-mtl" },
  ],
};

const NAMES = ["alex", "blair", "casey", "devon", "emery", "finley", "gray", "harper", "indigo", "jordan", "kai", "logan"];
function clients(siteId, count, subnet) {
  return Array.from({ length: count }, (_, i) => {
    const n = NAMES[(i + subnet) % NAMES.length];
    const band = i % 3 === 0 ? "24" : i % 3 === 1 ? "5" : "6";
    return {
      mac: mac(0x900000 + subnet * 0x100 + i), hostname: `${n}-laptop`, username: `${n}@example.com`,
      ip: `10.${subnet}.10.${20 + i}`, ssid: i % 5 === 4 ? "DemoGuest" : "DemoCorp", vlan_id: i % 5 === 4 ? 99 : 10,
      band, proto: band === "6" ? "ax" : band === "5" ? "ac" : "n", channel: band === "24" ? 6 : band === "5" ? 44 : 37,
      rssi: -48 - i * 3, snr: 42 - i * 2, manufacture: i % 2 ? "Apple" : "Dell", os: i % 2 ? "macOS" : "Windows 11",
      tx_rate: 866 - i * 40, rx_rate: 780 - i * 35, uptime: 3600 * (i + 1), last_seen: NOW - i * 7, site_id: siteId,
      ap_mac: mac(0x500 + subnet), key_mgmt: i % 5 === 4 ? "NONE" : "WPA2-EAP",
      ...(i % 5 === 4 ? { guest: { name: "Visitor " + (i + 1), email: `visitor${i + 1}@example.org`, company: "Example Co", authorized: true } } : {}),
    };
  });
}
const CLIENTS = { "site-hq": clients("site-hq", 9, 10), "site-ott": clients("site-ott", 5, 20), "site-mtl": clients("site-mtl", 3, 30) };

// ---- Alarms -----------------------------------------------------------------

const ALARM_DEFS = [
  { key: "switch_offline", display: "Switch offline", severity: "critical", group: "infrastructure" },
  { key: "ap_bad_cable", display: "AP bad cable", severity: "warn", group: "infrastructure" },
  { key: "dhcp_failure", display: "DHCP failure", severity: "major", group: "infrastructure" },
  { key: "rogue_ap", display: "Rogue AP detected", severity: "minor", group: "security" },
];
const ALARMS = {
  "site-hq": [
    { id: "al-1", type: "ap_bad_cable", timestamp: NOW - 3600, last_seen: NOW - 600, count: 3, aps: [mac(0x510)], hostnames: ["ap-hq-idf-1-2"], reasons: ["Cable test failed on pair 3"], status: "open", acked: false },
    { id: "al-2", type: "rogue_ap", timestamp: NOW - 7200, last_seen: NOW - 1800, count: 1, aps: [mac(0x511)], hostnames: ["ap-hq-core-1"], status: "open", acked: true, ack_admin_name: "Demo Admin" },
  ],
  "site-ott": [
    { id: "al-3", type: "dhcp_failure", timestamp: NOW - 5400, last_seen: NOW - 900, count: 12, switches: [mac(0x201)], hostnames: ["ott-sw1"], reasons: ["No DHCP offer on VLAN 20"], status: "open", acked: false },
  ],
  "site-mtl": [
    { id: "al-4", type: "switch_offline", timestamp: NOW - 86000, last_seen: NOW - 120, count: 1, switches: [mac(0x301)], hostnames: ["mtl-sw1"], status: "open", acked: false },
  ],
};

// ---- Mist router --------------------------------------------------------------

/** Answer one Mist API GET. Returns { status, body } or null for "not found". */
export function mist(path, query) {
  const m = (re) => path.match(re);
  let r;
  if (path === "/self") {
    return { body: { email: "demo.admin@example.com", privileges: [{ scope: "org", org_id: ORG_ID, name: "Demo Org", role: "read" }] } };
  }
  if (path === "/const/alarm_defs") return { body: ALARM_DEFS };
  if (path === `/orgs/${ORG_ID}/sites`) return { body: SITES };
  if (path === `/orgs/${ORG_ID}/templates`) return { body: TEMPLATES };
  if (path === `/orgs/${ORG_ID}/inventory`) {
    const type = query.get("type");
    return { body: type && type !== "switch" ? [] : type === "switch" ? inventory() : [...inventory(), ...OTHER_DEVICES] };
  }
  if (path === `/orgs/${ORG_ID}/inventory/search`) {
    const rows = SWITCHES.map((sw) => ({ ...inventory().find((x) => x.mac === sw.mac),
      members: (sw.vc || []).map((m, i) => ({ mac: m.mac, serial: m.serial, member_id: i + 1 })) }));
    return { body: { results: rows, total: rows.length } };
  }
  if (path === `/orgs/${ORG_ID}/stats/devices`) return { body: SWITCHES.map(switchStats) };
  if (path === `/orgs/${ORG_ID}/stats/ports/search`) {
    const rows = SWITCHES.flatMap((sw) => switchStats(sw).ports.map((p) => ({ ...p, mac: sw.mac, site_id: sw.site })));
    return { body: { results: rows, total: rows.length } };
  }
  if ((r = m(/^\/sites\/([^/]+)\/wlans\/derived$/))) return { body: WLANS[r[1]] || [] };
  if ((r = m(/^\/sites\/([^/]+)\/stats\/clients$/))) return { body: CLIENTS[r[1]] || [] };
  if ((r = m(/^\/sites\/([^/]+)\/stats\/devices$/))) return { body: SWITCHES.filter((s) => s.site === r[1]).map(switchStats) };
  if ((r = m(/^\/sites\/([^/]+)\/stats\/ports\/search$/))) {
    const rows = SWITCHES.filter((s) => s.site === r[1]).flatMap((sw) => switchStats(sw).ports.map((p) => ({ ...p, mac: sw.mac })));
    return { body: { results: rows, total: rows.length } };
  }
  if ((r = m(/^\/sites\/([^/]+)\/devices$/))) return { body: SWITCHES.filter((s) => s.site === r[1]).map(siteDevice) };
  if ((r = m(/^\/sites\/([^/]+)\/devices\/([^/]+)\/config_cmd$/))) {
    const sw = SWITCHES.find((s) => s.id === r[2] || `00000000-0000-0000-1000-${s.mac}` === r[2]);
    return sw ? { body: { cli: configCmd(sw) } } : null;
  }
  if ((r = m(/^\/sites\/([^/]+)\/devices\/([^/]+)$/))) {
    const sw = SWITCHES.find((s) => s.id === r[2]);
    return sw ? { body: siteDevice(sw) } : null;
  }
  if ((r = m(/^\/sites\/([^/]+)\/alarms\/search$/))) {
    const rows = (ALARMS[r[1]] || []).map((a) => ({ ...a, site_id: r[1] }));
    return { body: { results: rows, total: rows.length, limit: Number(query.get("limit")) || 100 } };
  }
  return null;
}

// ---- SSR Conductor --------------------------------------------------------------

const ROUTERS = [["rtr-hq", ["rtr-hq-a", "rtr-hq-b"]], ["rtr-ott", ["rtr-ott-a"]]];

function bgpText(router, phase) {
  const peers = router === "rtr-hq"
    ? [["192.0.2.1", 65010, phase === "post" ? "Active" : "48", phase === "post" ? "never" : "3d04h11m"],
       ["198.51.100.1", 65020, phase === "post" ? "52" : "51", "12d02h40m"]]
    : [["203.0.113.1", 65030, "17", "6d01h05m"]];
  return [
    `BGP router identifier 10.255.0.${router === "rtr-hq" ? 1 : 2}, local AS number 65001 vrf-id 0`,
    "BGP table version 1842",
    `RIB entries ${router === "rtr-hq" ? 211 : 64}, using 39 KiB of memory`,
    `Peers ${peers.length}, using 43 KiB of memory`,
    "",
    "Neighbor        V         AS   MsgRcvd   MsgSent   TblVer  InQ OutQ  Up/Down State/PfxRcd",
    ...peers.map(([ip, as, state, up]) =>
      `${ip.padEnd(15)} 4 ${String(as).padStart(10)} ${String(phase === "post" ? 9213 : 9180).padStart(9)} ${String(phase === "post" ? 9208 : 9175).padStart(9)} ${String(1842).padStart(8)} ${String(0).padStart(4)} ${String(0).padStart(4)} ${up.padStart(8)} ${state}`),
    "",
    `Total number of neighbors ${peers.length}`,
  ].join("\n");
}

/** Answer one Conductor request, given whether the post-check is running. */
export function conductor(method, path, phase) {
  if (method === "POST" && path === "/api/v1/login") return { body: { token: "demo-session" } };
  if (path.startsWith("/api/v1/asset")) {
    return { body: ROUTERS.flatMap(([routerName, nodes]) => nodes.map((nodeName) => ({ routerName, nodeName, status: "RUNNING" }))) };
  }
  let r = path.match(/^\/api\/v1\/router\/([^/]+)\/(.*)$/);
  if (!r) return null;
  const [, router, rest] = r;
  const nodeOf = rest.match(/^node\/([^/]+)\/(.*)$/);
  if (rest.startsWith("bgp")) return { body: bgpText(router, phase) };
  if (rest.startsWith("ospf")) {
    return { body: [{ neighborId: "10.255.0.9", priority: 1, state: "Full/DR", deadTime: "00:00:35", address: "10.255.9.2", interface: "wan1" }] };
  }
  if (rest.startsWith("alarm")) {
    return { body: phase === "post" && router === "rtr-hq"
      ? [{ id: "a-77", severity: "major", category: "peer", message: "BGP peer 192.0.2.1 down", node: "rtr-hq-a" }]
      : [] };
  }
  if (rest.startsWith("stats/aggregate-session")) {
    return { body: [{ node: `${router}-a`, value: phase === "post" ? 1311 : 1287 }] };
  }
  if (nodeOf) {
    const [, node, what] = nodeOf;
    if (what === "networkInterface") {
      return { body: [
        { name: "wan1", type: "external", address: "203.0.113.10/30", operationalStatus: "OPER_UP", mtu: 1500 },
        { name: "lan1", type: "internal", address: "10.10.0.1/24", operationalStatus: "OPER_UP", mtu: 1500 },
      ] };
    }
    if (what === "deviceInterface") {
      return { body: [
        { name: "wan1-dev", pciAddress: "0000:02:00.0", operationalStatus: "OPER_UP", speed: 1000 },
        { name: "lan1-dev", pciAddress: "0000:03:00.0", operationalStatus: "OPER_UP", speed: 1000 },
      ] };
    }
    if (what === "adjacency") {
      return { body: [{ peer: "dc-east", status: phase === "post" && node === "rtr-hq-a" ? "DOWN" : "UP", latency: 12, loss: 0 }] };
    }
    if (what === "status") return { body: { node, status: "RUNNING", role: "combo", uptime: 1209600 } };
    if (what === "version") return { body: { node, version: "6.2.5-5.r2", build: "demo" } };
  }
  return null;
}
