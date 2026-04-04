---
title: Presets
outline: [2, 3]
---

# Presets in the Configurator

The **Presets** tab lets you define reusable condition shortcuts and inspect presets loaded from sources. Instead of repeating `type: string`, `key: tier` across many definitions, you define a `tier` preset once and use `type: tier` everywhere.

For the full preset format, evaluation API, and schema reference, see the [Presets](/docs/presets) concept page.

## Custom presets editor

The top section of the Presets tab is a YAML/JSON textarea where you define your own presets. For example:

```yaml
tier:
  type: string
  key: tier
  overrides:
    op: eq
premium:
  type: bool
  key: premium
```

Type your preset definitions and click **Save**. If the input is invalid, an error message appears inline. Custom presets are saved to localStorage and persist across sessions.

Once saved, your preset types appear in the "Add condition" dropdown on the [Definitions](/docs/configurator-editing) tab. Preset conditions have their context key pre-filled and any overridden fields locked.

## Preset viewer

Below the editor, a **From Source** section shows presets provided by the active source. Presets are grouped by where they came from:

- **Presets URL** -- fetched from the source's dedicated presets endpoint (split mode only).
- **Definition file** -- embedded in the loaded definition file.
- **Per-definition groups** -- presets embedded in individual definition files (split mode only), shown under the definition key name.

Each preset row is expandable to reveal its `type`, `key`, and `overrides`. An amber icon indicates a source preset that shares the same name as one of your custom presets -- see merge order below.

If no source is loaded or the source has no presets, this section shows an empty state.

![Presets tab with editor and viewer](/images/configurator-presets-tab.png)

## Merge order

When presets exist in multiple places, they are merged into a single set. In JavaScript spread semantics, later entries override earlier ones with the same name.

### Bundled mode

When using a bundled-mode source or a file import, all definitions share one merged preset set:

```
{ ...customPresets, ...filePresets, ...sourcePresets }
```

**Source presets** (from the presets URL) take the highest priority, then **file presets** (embedded in the definition file), then **custom presets** (from the editor).

### Split mode

Each definition sees shared presets plus its own embedded presets:

```
shared = { ...customPresets, ...filePresets, ...sourcePresets }
merged = { ...shared, ...perDefinitionPresets }
```

**Per-definition presets** (embedded in that key's file) take the highest priority, followed by the shared set.

### Avoiding collisions

If a source preset has the same name as your custom preset, the source preset wins in the merged set. The amber icon in the preset viewer flags these collisions.

::: tip
Give custom presets unique names that won't collide with source-provided presets. Or, if the source presets are authoritative, use the custom editor only for presets that the source doesn't provide.
:::

## Next steps

- [Presets](/docs/presets) for the full format reference and evaluation API
- [Editing Definitions](/docs/configurator-editing) to use preset conditions in the editor
- [Sources](/docs/configurator-sources) to load sources that include presets
