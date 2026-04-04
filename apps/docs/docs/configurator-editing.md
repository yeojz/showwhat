---
title: Editing Definitions
outline: [2, 3]
---

# Editing Definitions

The **Definitions** tab is where you create and configure your feature flags and config rules. It has three panels: a **sidebar** on the left listing all definitions, an **editor** in the center for the selected definition, and a **preview panel** on the right for testing.

![Configurator layout](/images/configurator-layout.png)

## Definitions

### Creating a definition

Click the **New definition** button at the bottom of the sidebar. A text field appears -- type a key (for example, `dark-mode` or `pricing-tier`) and press Enter. The new definition opens in the editor with no variations yet.

### Renaming

The definition key is displayed as a heading at the top of the editor. Click it to rename inline.

### Description

Below the key is an optional **description** field -- a one-liner that helps your team understand what this definition controls.

### Active toggle

Every definition has an **Active** toggle in the top-right corner. When inactive, the rule engine skips it during resolution and throws a `DefinitionInactiveError`. Use this to temporarily disable a flag without deleting it.

### Deleting

Hover over a definition in the sidebar and click the trash icon. A confirmation dialog will ask you to confirm.

## Variations

A **variation** is a possible value your definition can resolve to. The rule engine evaluates variations top to bottom and returns the first one whose conditions all match.

### Adding a variation

Click **Add** next to the "Variations" heading. A new collapsed card appears. Expand it to see:

- **Value** -- the value returned when this variation matches. Supports strings, numbers, booleans, and JSON objects.
- **Description** -- an optional label to tell variations apart at a glance.
- **Conditions** -- the rules that determine whether this variation matches.

### Default fallback

A variation with no conditions always matches -- it is a **catch-all**. Place it last so it serves as the default. If a catch-all appears before other variations, everything below it will never be reached.

### Reordering

Grab the **drag handle** (the grip icon on the left edge of each card) and drag the variation to its new position.

## Conditions

Conditions define when a variation should match. Expand a variation card and click **Add condition** to see the available types:

- **String** -- compare a context field against a string value.
- **Number** -- compare a context field against a numeric value.
- **Datetime** -- compare a context field against a date and time.
- **Boolean** -- check whether a context field is true or false.
- **Environment** -- match against an environment name (shorthand for a string comparison on `env`).
- **Start At** / **End At** -- time-window conditions based on `context.at`.
- **Custom** -- a freeform type for app-specific logic that your own evaluator handles.

All conditions on a single variation are combined with **AND** logic -- every condition must pass.

See [Conditions](/docs/conditions) for full details on each type, including operators, value formats, and regex.

### AND / OR groups

The dropdown also offers **AND Group** and **OR Group** for complex rules:

- An **AND group** requires all inner conditions to pass.
- An **OR group** requires at least one to pass.

Groups can be nested, so you can build expressions like "environment is production AND (region is us-east-1 OR region is eu-west-1)". Between each condition in a group, a badge shows the logic (**AND** or **OR**) so the evaluation order is always visible.

![Nested condition groups](/images/configurator-conditions.png)

### Preset conditions

If [presets](/docs/presets) are loaded (from a source or custom-defined), they also appear in the "Add condition" dropdown. Preset conditions have their context key pre-filled and locked, and any overridden fields are disabled. See [Presets](/docs/configurator-presets) for how to set them up.

## Preview panel

The preview panel on the right lets you test the selected definition without leaving the editor.

### Context

Enter a JSON object in the **Context** textarea representing the runtime values your application would provide:

```json
{ "env": "production", "region": "us-east-1" }
```

Click **Resolve**. The panel shows which variation matched (or why none did), the returned value, the variation index, and the number of conditions evaluated. If the definition is inactive, you see an "Inactive" badge. If no variation matched, you see "No Match".

![Preview panel](/images/configurator-preview.png)

### Condition simulator

Below the context input is a collapsible **Condition Simulator**. This handles condition types the built-in engine cannot evaluate -- custom or unregistered types that would normally need your application's evaluator.

Enter overrides as one `type:true` or `type:false` per line:

```
tier:true
geo:false
```

When you resolve, any condition whose type appears here uses your override instead of failing.

### Seed annotations

If your conditions use [annotations](/docs/annotations), the preview panel has an annotations input where you can provide seed values as JSON. These are passed to evaluators during resolution, letting you simulate annotation-dependent conditions like `matchAnnotations`.

## Saving and status

### Status indicators

Each definition in the sidebar shows a status dot:

- **Green (filled)** -- active and saved.
- **Green (hollow)** -- active with unsaved changes.
- **Yellow (filled)** -- inactive and saved.
- **Yellow (hollow)** -- inactive with unsaved changes.
- **Red** -- has validation errors.

![Status Indicator](/images/configurator-status-indicator.png)

### Save and discard

The action bar at the top of the editor has **Save** and **Discard** buttons. Save persists your changes to localStorage. Discard reverts to the last saved state (with a confirmation dialog).

### Status badge

The **status badge** in the sidebar header reflects the global state across all definitions:

- **ready** (green) -- everything is saved.
- **unsaved** (amber) -- one or more definitions have pending edits. Click the badge to open a confirmation dialog and **revert all changes** at once.
- **errors** (red) -- validation issues exist.

If you try to close or navigate away from the browser tab while unsaved changes exist, the browser warns you.

## Exporting

The **Export** button in the sidebar header lets you download all saved definitions as YAML or JSON. The exported file includes any file-level [presets](/docs/presets). Export is disabled when you have unsaved changes or validation errors -- save or discard first.

::: tip
In **keyed mode** (when a keyed source is loaded), the bulk export button is hidden. Instead, each definition has its own export option for downloading just that definition as a standalone file.
:::

## Next steps

- [Sources](/docs/configurator-sources) to load definitions from files or remote endpoints
- [Presets](/docs/configurator-presets) to define reusable condition shortcuts
- [Conditions](/docs/conditions) for full details on each condition type
- [Definitions](/docs/definitions) for how definitions work under the hood
