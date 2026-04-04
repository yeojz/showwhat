---
title: Sources
outline: [2, 4]
---

# Sources

The **Sources** tab manages where your definitions come from. You can import a local file or connect to a remote HTTP endpoint. Sources are saved in your browser's localStorage, so they persist across sessions.

The layout has two panes. The **left pane** shows an "Active" section at the top (the currently loaded source, imported file, or unsaved draft) and a "Sources" list below it with all your saved URL sources. The **right pane** shows details for the selected item.

![Sources tab layout](/images/configurator-sources-layout.png)

## File source

Click the **+** button next to the "Sources" heading and choose **From file**. The app accepts `.yaml`, `.yml`, and `.json` files.

If you already have definitions loaded, a confirmation dialog warns that importing will replace them. When imported, the file appears in the "Active" section with the filename and format badge. Switch to the Definitions tab to start editing.

## URL source

Click the **+** button and choose **From URL**. A dialog appears with the following fields:

- **Label** -- a friendly name for this source (e.g. "Production", "Staging").
- **Mode** -- choose between **Single file** or **Keyed (per-definition)**.
- **Format** -- YAML or JSON.

### Single file mode

A single URL returns a complete definitions file -- the same format as a local YAML/JSON file.

You provide one field:

- **URL** -- the full endpoint (e.g. `https://r2.example.com/flags.yaml`).

When loaded, the app fetches the entire file, parses all definitions at once, and loads any embedded presets automatically.

### Keyed mode

Each definition is fetched individually from its own URL. This works well with object storage (S3, R2) or APIs that serve definitions per-key.

You provide:

- **Base URL** (required) -- definition keys are appended as path segments. For example, base URL `https://r2.example.com/defs/` plus key `dark-mode` fetches from `https://r2.example.com/defs/dark-mode`.
- **List URL** (optional) -- an endpoint that returns available definition keys, enabling automatic key discovery instead of manual entry.
- **Presets URL** (optional) -- an endpoint that returns shared [presets](/docs/presets) for all definitions.

![Add source dialog in keyed mode](/images/configurator-source-form.png)

### Loading and unloading

After adding a source, select it in the left pane. The right pane shows its details and a **Load** button. Clicking Load opens a confirmation dialog (loading replaces current definitions and unsaved changes). Once loaded, a **loaded** badge appears next to the source name.

To disconnect, click **Unload** in the detail panel action bar. You can also **Edit** (opens the source form dialog) or **Delete** (with confirmation) from the same bar.

### Source detail panel

Once a URL source is loaded, the right pane shows its detail panel. The contents vary by mode.

#### Single mode

**Endpoints** -- the URL with a **reload** button and a fetch timestamp (e.g. "2h ago"). Clicking reload fetches the latest definitions from the URL and replaces the current set.

**Headers** -- see [Custom headers](#custom-headers) below.

#### Keyed mode

The detail panel for a keyed source has three sections:

**Endpoints** -- lists the configured URLs:

- **Base URL** -- shown for reference (keys are appended to this prefix).
- **List URL** -- if configured, includes a reload button and timestamp. Reloading fetches the latest key list from the endpoint.
- **Presets URL** -- if configured, includes a reload button and timestamp. Reloading fetches the latest shared presets.

**Definition keys** -- shows each key with:

- A **fetch timestamp** (e.g. "3m ago") showing when the key was last loaded.
- A **reload** button to re-fetch that individual definition. Disabled if the key has unsaved changes -- save or discard first.
- A **remove** button to delete the key from the list.

You can add keys in two ways:

- **Manually** -- type a key name in the text input at the bottom and click **Add**.
- **From list endpoint** -- if a list URL is configured, click its reload button to populate the key list automatically.

![Keyed source detail panel](/images/configurator-source-keyed-detail.png)

**Custom headers** {#custom-headers} -- a collapsible section for adding HTTP headers sent with every fetch request. Add key-value pairs using the inputs and click **Add**. Remove individual headers with the **x** button.

::: warning
Headers are stored in your browser's localStorage. Avoid storing long-lived secrets here. Use short-lived tokens or session-scoped credentials when possible.
:::

### Safety limits and CORS

The app enforces the following when fetching from remote sources:

| Limit         | Value                                                              |
| ------------- | ------------------------------------------------------------------ |
| Protocol      | HTTPS required. HTTP allowed only for `localhost` and `127.0.0.1`. |
| Response size | 5 MB maximum.                                                      |
| Timeout       | 30 seconds per request.                                            |

If you see a "Failed to fetch" error, your server likely isn't returning the right CORS headers. Check that the `Access-Control-Allow-Origin` header includes the app's origin. This is a common issue with S3, R2, and similar object storage services -- consult your provider's CORS configuration docs.

## Next steps

- [Editing Definitions](/docs/configurator-editing) to work with the definitions you loaded
- [Presets](/docs/configurator-presets) to define and manage condition presets
- [Custom Data Sources](/docs/custom-data-sources) for implementing your own server-side data source
