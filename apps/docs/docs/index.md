---
title: showwhat
---

# showwhat

showwhat is a definition format, rule engine, and visual tooling for feature flags and config.

- **Portable format** — YAML/JSON definitions you can store in files, APIs, databases, or version control
- **In-app evaluation** — resolve flags and config inside your own application
- **Extensible rule engine** — schema-validated, fail-closed, with custom condition types
- **Optional visual tooling** — author and test definitions in the [configurator](/docs/configurator)

See [Comparison](/docs/comparison) for how this differs from hosted feature flag platforms.

## Quick Start {#quick-start}

Install the core package:

```bash
# Node.js
npm install showwhat
pnpm add showwhat
yarn add showwhat

# Other runtimes
bun add showwhat
deno install npm:showwhat
```

### Your first definition

Create a file with your definitions in YAML or JSON:

::: code-group

```yaml [flags.yaml]
definitions:
  checkout_v2:
    variations:
      - value: true
        conditions:
          - type: env
            value: prod
      - value: false
```

```json [flags.json]
{
  "definitions": {
    "checkout_v2": {
      "variations": [
        { "value": true, "conditions": [{ "type": "env", "value": "prod" }] },
        { "value": false }
      ]
    }
  }
}
```

:::

Each definition has **variations** evaluated top-to-bottom. The first variation whose conditions all match wins. Use definitions for boolean flags, config values, or structured objects. A variation with no conditions always matches, so use it as the default.

### Resolve a definition

```ts
import { showwhat, MemoryData } from "showwhat";

const data = await MemoryData.fromYaml(`
definitions:
  checkout_v2:
    variations:
      - value: true
        conditions:
          - type: env
            value: prod
      - value: false
`);

const result = await showwhat({
  keys: ["checkout_v2"],
  context: { env: "prod" },
  options: { data },
});

const entry = result["checkout_v2"];
if (!entry.success) {
  console.log(entry.error); // ShowwhatError
} else {
  console.log(entry.value); // true
}
```

The `context` object tells showwhat about the current environment. The `data` option provides the definitions. The result is a `Resolutions` record keyed by definition name, with each entry is either a successful `Resolution` (`success: true`) or a `ResolutionError` (`success: false`).

### Next steps

- [Definitions](/docs/definitions) — how definitions are structured
- [Conditions](/docs/conditions) — all built-in condition types
- [Context](/docs/context) — the context object
- [Data Sources](/docs/memory) — built-in MemoryData source
- [Custom Data Sources](/docs/custom-data-sources) — filesystem, HTTP, and other implementations
- [OpenFeature](/docs/openfeature) — use showwhat with the OpenFeature SDK
