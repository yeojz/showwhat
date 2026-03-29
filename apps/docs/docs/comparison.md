---
title: Comparison
outline: [2, 3]
---

# How showwhat compares

Most feature flag tools are platforms: a dashboard, a database, an SDK that polls a server. showwhat is a different kind of tool — a definition format, a rule engine, and optional visual tooling. You bring the storage and workflow.

::: tip The OpenAPI + Swagger analogy
showwhat follows the same model as OpenAPI: a portable definition format with tooling built around it. Definitions are the source of truth.
:::

|                     | showwhat                                                                     | SaaS platforms                | OSS platforms                   |
| ------------------- | ---------------------------------------------------------------------------- | ----------------------------- | ------------------------------- |
| Approach            | Specification-first                                                          | Platform-first                | Platform-first                  |
| Type                | Definition format + engine + visual tooling                                  | Managed SaaS                  | SaaS or self-hosted             |
| Source of truth     | Your YAML/JSON definitions                                                   | Vendor database               | Vendor database                 |
| Price               | Free (MIT)                                                                   | Free tier + paid              | Free tier + paid                |
| Infrastructure      | None                                                                         | Vendor-hosted                 | Vendor or self-hosted           |
| Vendor lock-in      | None                                                                         | Yes                           | Partial (OSS core)              |
| Config values       | [Any type](/docs/definitions#value-types)                                    | Boolean, string, number, JSON | Varies by platform              |
| Governance          | Your existing workflow (PRs, history, CI)                                    | Built-in RBAC + audit         | RBAC + audit (often paid tiers) |
| Visual editor       | [Configurator](/docs/configurator)                                           | Yes                           | Yes                             |
| Percentage rollouts | [Via custom conditions](/docs/custom-conditions#example-percentage-rollouts) | Yes                           | Yes                             |
| User targeting      | [Via custom conditions](/docs/custom-conditions)                             | Yes (segments + rules)        | Yes (identities, attributes)    |

_SaaS platforms: e.g. LaunchDarkly. OSS platforms: e.g. Flagsmith, GrowthBook, Unleash. See each provider's pricing page for current details._

## When showwhat fits

- Your team already uses Git-based workflows and wants flags and config to live alongside code
- You want to embed evaluation in your app, or serve definitions from your own API
- **Code review, CI, and commit history** are your governance model
- You need config values beyond booleans (objects, arrays, nested structures)
- You want to extend the condition system with your own evaluators via [`registerEvaluators()`](/docs/custom-conditions)
- You need [OpenFeature](/docs/openfeature) compatibility

**Why choose showwhat:**

- **No per-seat pricing.** MIT licensed. No usage tiers, no feature gates, no "talk to sales."
- **No vendor dependency.** If you stop using showwhat tomorrow, your definitions are still valid YAML or JSON.
- **You choose the architecture.** Embed definitions in your app, serve them from an endpoint, or store them in a database. showwhat is the engine. You decide how to deploy it.
- **Governance you already have.** Code review, branch protection, and CI are your approval workflow. No separate admin console to learn.

## When a hosted platform is a better fit

If you need out-of-the-box enterprise multi-team governance, experimentation analytics, real-time streaming updates, or managed identity storage, a hosted platform handles that for you. showwhat gives you the building blocks. Platforms bundle the operations.
