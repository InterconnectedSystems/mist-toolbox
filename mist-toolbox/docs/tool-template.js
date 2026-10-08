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
