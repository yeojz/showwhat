---
title: Comparison
outline: [2, 3]
---

# How showwhat compares

showwhat takes a specification-first approach to feature flags. Most alternatives are platforms: a dashboard, a database, an SDK that polls a server. showwhat is a portable definition format, an evaluation engine, and a visual editor.

::: tip Emulating OpenAPI + Swagger for configuration rules
Similar to how OpenAPI defines API contracts as a spec with tooling (Swagger UI, codegen) built around it, showwhat does the same for feature flags and remote config.
:::

|                     | showwhat                                                                     | SaaS platforms                | OSS platforms                   |
| ------------------- | ---------------------------------------------------------------------------- | ----------------------------- | ------------------------------- |
| Approach            | Specification-first                                                          | Platform-first                | Platform-first                  |
| Type                | Format + engine (npm)                                                        | Managed SaaS                  | SaaS or self-hosted             |
| Source of truth     | YAML/JSON files (Git)                                                        | Vendor database               | Vendor database                 |
| Price               | Free (MIT)                                                                   | Free tier + paid              | Free tier + paid                |
| Infrastructure      | None                                                                         | Vendor-hosted                 | Vendor or self-hosted           |
| Vendor lock-in      | None                                                                         | Yes                           | Partial (OSS core)              |
| Config values       | [Any type](/docs/definitions#value-types)                                    | Boolean, string, number, JSON | Varies by platform              |
| Governance          | Git (PRs, history, branch protection)                                        | Built-in RBAC + audit         | RBAC + audit (often paid tiers) |
| Dashboard           | YAML + [configurator](/docs/configurator)                                    | Yes                           | Yes                             |
| Percentage rollouts | [Via custom conditions](/docs/custom-conditions#example-percentage-rollouts) | Yes                           | Yes                             |
| User targeting      | [Via custom conditions](/docs/custom-conditions)                             | Yes (segments + rules)        | Yes (identities, attributes)    |

_SaaS platforms: e.g. LaunchDarkly. OSS platforms: e.g. Flagsmith, GrowthBook, Unleash. See each provider's pricing page for current details._

## When to use a platform instead

`showwhat` is stateless and Git-native by design. Many of these platform features can be achieved with additional tooling around the core library.

However, if you need out-of-the-box enterprise multi-team governance, built-in A/B testing analytics, real-time streaming, or managed identity storage, consider using a platform.

## When showwhat fits

- You want a **portable definition format** that lives in version control
- **Git workflows** (PRs, branch protection, commit history) are your governance model
- You need config values beyond booleans (objects, arrays, nested structures)
- You prefer **no infrastructure** to operate or vendor to depend on
- You want to extend the condition system with your own evaluators via [`extendEvaluators()`](/docs/custom-conditions)
- You need [OpenFeature](/docs/openfeature) compatibility to serve flags to any language
