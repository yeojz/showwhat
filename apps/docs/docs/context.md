---
title: Context
---

# Context

The context object tells showwhat about the current request environment. Conditions evaluate against it.

## Built-in properties

| Property | Type                | Used by                       |
| -------- | ------------------- | ----------------------------- |
| `env`    | `string`            | `env` condition               |
| `at`     | `string` (ISO 8601) | `startAt`, `endAt` conditions |

## Custom properties

The context accepts arbitrary properties with `string`, `number`, or `boolean` values. Use them with primitive condition types:

```ts
const result = await showwhat({
  key: "my_flag",
  context: {
    env: "prod",
    at: new Date().toISOString(),
    region: "us-east-1",
    tenant: "acme",
    premium: true,
    score: 85,
  },
  options: { data },
});
```

```yaml
definitions:
  my_flag:
    variations:
      - value: "custom"
        conditions:
          - type: string
            key: tenant
            op: eq
            value: acme
      - value: "default"
```

## When to pass `at`

Time-based conditions (`startAt`, `endAt`) check `context.at`. If you use time-based conditions, pass the current time:

```ts
context: {
  env: "prod",
  at: new Date().toISOString(),
}
```

If `context.at` is not provided, time-based conditions will not match.
