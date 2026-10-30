# Installing Mist Toolbox

Mist Toolbox is a browser extension for **Google Chrome** and **Microsoft Edge**, on Windows,
macOS or Linux. Nothing else needs to be installed: no Python and no server. It is loaded as an
*unpacked* extension straight from a folder on your computer.

> **Safari is not supported.** Safari only runs extensions packaged as a signed Mac app.

## 1. Download the release ZIP (recommended)

**[⬇ Download mist-toolbox.zip](https://github.com/InterconnectedSystems/mist-toolbox/releases/latest/download/mist-toolbox.zip)**, the latest release, also listed on the
[Releases page](https://github.com/InterconnectedSystems/mist-toolbox/releases/latest).

It contains just the extension, ready to load. Unzip it somewhere you will keep, for example
`Documents/mist-toolbox`. You get a folder called **`mist-toolbox`** with `manifest.json`
inside. That folder is what you load in step 2.

<details>
<summary>Other ways to get it (for developers)</summary>

- **Source ZIP:** the green **Code** button → **Download ZIP**. This includes the original
  scripts, tests and screenshots; the extension is the `mist-toolbox` folder inside it.
- **git:** `git clone https://github.com/InterconnectedSystems/mist-toolbox.git`, then load
  the `mist-toolbox` folder inside the clone.

</details>

> Keep that folder where it is. The browser runs the extension from it, so if the folder is
> moved or deleted, the extension stops working.

## 2. Load it into the browser

| | Chrome | Edge |
|---|---|---|
| Open | `chrome://extensions` | `edge://extensions` |
| Turn on | **Developer mode** (top right) | **Developer mode** (left sidebar) |
| Click | **Load unpacked** | **Load unpacked** |
| Select | the `mist-toolbox` folder | the `mist-toolbox` folder |

Then pin it: click the puzzle-piece icon in the toolbar → pin **Mist Toolbox**.

![chrome://extensions with Developer mode on and Mist Toolbox loaded](mist-toolbox/docs/screenshots/00-chrome-extensions.png)

## 3. First use

1. Click the Mist Toolbox icon. The toolbox opens in its own tab.
2. Pick your **Mist region** (the cloud your portal URL is on, e.g. `manage.gc2.mist.com` → *Global 04*).
3. Paste a **read-only API token** and press **Validate token**.
   Create one in the Mist portal under your account's profile (*My Profile → API Token →
   Create Token*). A token from an **Observer** or other read-only role is all the toolbox needs.
4. Choose the **Organization**, then any tool.

![The tool menu after the token is validated](mist-toolbox/docs/screenshots/02-home.png)

The token is held in that tab's memory only. It is never saved, never sent anywhere except the
Mist region you picked, and wiped after 30 minutes idle or when you press **End session**.

The **SSR Pre/Post Check** does not use the Mist token. It asks for your SSR Conductor's URL,
username and password. The first time you connect, the browser asks permission to reach that
one Conductor. If the Conductor uses a self-signed certificate, the tool links you to open it
in a tab and accept the certificate once.

## Updating

- **Release ZIP:** [download the latest `mist-toolbox.zip`](https://github.com/InterconnectedSystems/mist-toolbox/releases/latest/download/mist-toolbox.zip), replace the files in your
  `mist-toolbox` folder with the new ones, then press the **reload** arrow on the extension's
  card in `chrome://extensions`. Your token and settings are never stored, so nothing else
  needs redoing.
- **git:** `git pull`, then press **reload**.

> Tools you added yourself live in `mist-toolbox/tools/`. Copy them somewhere safe before
> replacing the folder, and add them back with **Manage tools** afterwards. A `git pull` keeps
> them.

## Troubleshooting

| What you see | What to do |
|---|---|
| **Load unpacked** is missing | Turn on **Developer mode** first. |
| "Manifest file is missing or unreadable" | You picked the wrong folder. Pick the unzipped `mist-toolbox` folder, the one that contains `manifest.json`. If unzipping made a folder inside a folder, go one level down. |
| Chrome warns about developer-mode extensions at startup | Expected for unpacked extensions. Choose to keep it. |
| Extensions are blocked by your organisation | A managed browser can forbid unpacked extensions; ask your IT team. |
| macOS asks whether Chrome may access a folder | Allow it. This appears when **Manage tools** writes into a folder under Desktop, Documents or Downloads. |
| "Validate a Mist token first" / 401 | The token is wrong, expired, or for another region. Check the region drop-down. |
| A tool card says it did not load | Open **Manage tools** and **Remove** it, or fix the file and reload the extension. |

Next: [add your own tools with an AI assistant](ADDING_TOOLS.md).
