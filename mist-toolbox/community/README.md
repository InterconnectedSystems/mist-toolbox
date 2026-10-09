# Community tools

Tools contributed by Mist Toolbox users. They are not built in and do not ship in the release
ZIP. To add one to your toolbox, pick it from the table, then:

1. Open the file on GitHub, click **Raw**, and save it as a `.js` file.
2. In the toolbox, go to **Manage tools → Install** and choose that file. It is checked first,
   then it appears in the menu.

Every tool here passes the same checks the Install panel runs, plus the policy tests on each
pull request: read-only Mist calls through `ctx`, no storage, no direct network access. Those
checks catch mistakes, not deliberate tricks. A tool runs with access to your Mist session, so
read it before you install it.

Want to share your own? See **[CONTRIBUTING.md](../../CONTRIBUTING.md)**.

## Tools

<!-- One row per file, kept in alphabetical order by file. tests/community.test.js checks that every file is listed. -->

| Tool | File | Level | Author | What it does |
|---|---|---|---|---|
