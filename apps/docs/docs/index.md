---
title: showwhat
---

# showwhat

An extensible schema and rule based evaluation engine for feature flags and configuration.

- **Specification-first** — definitions are YAML/JSON files that live in Git
- **Zero infrastructure** — no server, database, or vendor to operate
- **Extensible** — add custom condition types, bring your own data source

See [Comparison](/docs/comparison) for how this differs from feature flag platforms.

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

Each definition has **variations** evaluated top-to-bottom. The first variation whose conditions all match wins. A variation with no conditions always matches (use it as a default).

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
if (entry.error) {
  console.log(entry.error); // ShowwhatError
} else {
  console.log(entry.value); // true
}
```

The `context` object tells showwhat about the current environment. The `data` option provides the definitions. The result is a `Resolutions` record keyed by definition name -- each entry is either a successful `Resolution` or a `ResolutionError`.

### Next steps

- [Definitions](/docs/definitions) — how definitions are structured
- [Conditions](/docs/conditions) — all built-in condition types
- [Context](/docs/context) — the context object
- [Data Sources](/docs/memory) — built-in MemoryData source
- [Custom Data Sources](/docs/custom-data-sources) — filesystem, HTTP, and other implementations
- [OpenFeature](/docs/openfeature) — use showwhat with the OpenFeature SDK
