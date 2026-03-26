---
title: Sample Config
---

# Sample Config

A complete definitions file showing the most common patterns. See [Definitions](/docs/definitions), [Conditions](/docs/conditions), and [Presets](/docs/presets) for details.

```yaml
# ──────────────────────────────────────────────
# Presets — reusable shortcuts for condition types
# ──────────────────────────────────────────────
presets:
  tier:
    type: string
    key: tier
    defaults:
      op: eq
      value: free

  premium:
    type: bool
    key: premium

# ──────────────────────────────────────────────
# Definitions
# ──────────────────────────────────────────────
definitions:
  # ── Simple boolean flag (env-gated) ────────
  checkout_v2:
    description: "New checkout flow"
    variations:
      - value: true
        conditions:
          - type: env
            value: prod
      - value: false # default

  # ── Numeric config (different per env) ─────
  max_upload_mb:
    variations:
      - value: 50
        conditions:
          - type: env
            value: prod
      - value: 25
        conditions:
          - type: env
            value: staging
      - value: 10 # default for dev / preview

  # ── Object value (API config) ──────────────
  api_config:
    variations:
      - value:
          url: "https://api.example.com"
          timeout: 5000
        conditions:
          - type: env
            value: prod
      - value:
          url: "https://staging-api.example.com"
          timeout: 10000

  # ── Time-bounded rollout ───────────────────
  maintenance_banner:
    description: "Show banner during deployment window"
    variations:
      - value: "Deployment in progress"
        conditions:
          - type: env
            value: prod
          - type: startAt
            value: "2026-04-01T02:00:00Z"
          - type: endAt
            value: "2026-04-01T07:00:00Z"
      - value: null # no banner

  # ── String matching with regex ─────────────
  tenant_branding:
    variations:
      - value: "acme"
        conditions:
          - type: string
            key: tenant
            op: regex
            value: "^acme-.*"
      - value: "partner"
        conditions:
          - type: string
            key: tenant
            op: in
            value: [partner-a, partner-b]
      - value: "default"

  # ── Composite conditions (and / or) ────────
  beta_dashboard:
    description: "New dashboard for premium users in prod/staging"
    variations:
      - value: true
        conditions:
          - type: and
            conditions:
              - type: or
                conditions:
                  - type: env
                    value: prod
                  - type: env
                    value: staging
              - type: premium # uses the preset above
                value: true
      - value: false

  # ── Using a preset condition ───────────────
  pro_features:
    variations:
      - value: true
        conditions:
          - type: tier # uses the "tier" preset
            op: eq
            value: pro
      - value: false

  # ── Inactive flag ──────────────────────────
  legacy_auth:
    active: false # resolving this throws DefinitionInactiveError
    variations:
      - value: true
```

## Resolving

Load the file and resolve definitions against a context:

```ts
import { showwhat, MemoryData } from "showwhat";
import { readFile } from "node:fs/promises";

const yaml = await readFile("flags.yaml", "utf-8");
const data = await MemoryData.fromYaml(yaml);

const result = await showwhat({
  key: "checkout_v2",
  context: { env: "prod" },
  options: { data },
});

console.log(result.value); // true
```
