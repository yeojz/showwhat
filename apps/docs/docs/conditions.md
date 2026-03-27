---
title: Conditions
outline: [2, 3]
---

# Conditions

Conditions determine when a variation matches. Each condition has a `type` and type-specific fields.

## Primitive condition types

### `string`

Matches a string value from the context.

```yaml
# Exact match (single value)
conditions:
  - type: string
    key: region
    op: eq
    value: us-east-1

# Not equal (single value)
conditions:
  - type: string
    key: region
    op: neq
    value: eu-central-1

# Matches any value in list
conditions:
  - type: string
    key: region
    op: in
    value: [us-east-1, us-west-2]

# Matches none of the values in list
conditions:
  - type: string
    key: region
    op: nin
    value: [eu-central-1, ap-southeast-1]

# Regex match (single pattern)
conditions:
  - type: string
    key: region
    op: regex
    value: "^us-"
```

| Field   | Required | Description                                                    |
| ------- | -------- | -------------------------------------------------------------- |
| `key`   | Yes      | The context property to check                                  |
| `op`    | Yes      | `"eq"`, `"neq"`, `"in"`, `"nin"`, or `"regex"`                 |
| `value` | Yes      | String for `eq`/`neq`/`regex`, array of strings for `in`/`nin` |

::: tip
Use `eq`/`neq` for single-value comparison, `in`/`nin` for matching against a list, and `regex` for pattern matching. If you need to match multiple patterns with regex, use alternation: `"^us-|^eu-"`.
:::

### `number`

Matches a numeric value from the context. Works with integers and decimals.

```yaml
# Comparison (single value)
conditions:
  - type: number
    key: age
    op: gte
    value: 18

# Matches any value in list
conditions:
  - type: number
    key: statusCode
    op: in
    value: [200, 201, 204]

# Matches none of the values in list
conditions:
  - type: number
    key: statusCode
    op: nin
    value: [400, 401, 403, 404]
```

| Field   | Required | Description                                                                  |
| ------- | -------- | ---------------------------------------------------------------------------- |
| `key`   | Yes      | The context property to check                                                |
| `op`    | Yes      | `"eq"`, `"neq"`, `"gt"`, `"gte"`, `"lt"`, `"lte"`, `"in"`, or `"nin"`        |
| `value` | Yes      | Number for `eq`/`neq`/`gt`/`gte`/`lt`/`lte`, array of numbers for `in`/`nin` |

String context values are coerced to numbers automatically. If the value cannot be parsed, the condition does not match.

::: tip
Use `in`/`nin` to check membership in a set of numbers, such as HTTP status codes or category IDs.
:::

### `datetime`

Matches an ISO 8601 datetime value from the context.

```yaml
conditions:
  - type: datetime
    key: at
    op: gte
    value: "2026-03-03T02:00:00Z"
```

| Field   | Required | Description                              |
| ------- | -------- | ---------------------------------------- |
| `key`   | Yes      | The context property to check            |
| `op`    | Yes      | `"eq"`, `"gt"`, `"gte"`, `"lt"`, `"lte"` |
| `value` | Yes      | ISO 8601 datetime string                 |

### `bool`

Matches a boolean value from the context.

```yaml
conditions:
  - type: bool
    key: premium
    value: true
```

| Field   | Required | Description                      |
| ------- | -------- | -------------------------------- |
| `key`   | Yes      | The context property to check    |
| `op`    | No       | `"eq"` (default, can be omitted) |
| `value` | Yes      | `true` or `false`                |

String context values `"true"` and `"false"` are coerced to booleans automatically.

## Shorthand condition types

These are shortcuts for common patterns that delegate to primitives internally.

### `env`

Matches when `context.env` equals the value. Equivalent to a `string` condition with `key: "env"` and `op: "eq"`.

```yaml
conditions:
  - type: env
    value: prod
```

The value can be a string or an array of strings (matches any):

```yaml
conditions:
  - type: env
    value: [prod, staging]
```

### `startAt`

Matches when `context.at` is **on or after** the specified ISO 8601 datetime.

```yaml
conditions:
  - type: startAt
    value: "2026-03-03T02:00:00Z"
```

### `endAt`

Matches when `context.at` is **before** the specified ISO 8601 datetime.

```yaml
conditions:
  - type: endAt
    value: "2026-03-03T07:00:00Z"
```

### Combining `startAt` and `endAt`

Use both to create a time window:

```yaml
definitions:
  maintenance_banner:
    variations:
      - value: "Deployment in progress"
        conditions:
          - type: startAt
            value: "2026-03-03T02:00:00Z"
          - type: endAt
            value: "2026-03-03T07:00:00Z"
      - value: null
```

::: tip
Remember to pass `at` in the context. If `context.at` is not provided, time-based conditions will not match.

```ts
const result = await showwhat({
  keys: ["maintenance_banner"],
  context: { env: "prod", at: new Date().toISOString() },
  options: { data },
});
const banner = result["maintenance_banner"];
if (!banner.error) {
  console.log(banner.value);
}
```

:::

## Composite conditions

### `and`

Matches when **all** child conditions match.

```yaml
conditions:
  - type: and
    conditions:
      - type: env
        value: prod
      - type: string
        key: region
        op: eq
        value: us-east-1
```

### `or`

Matches when **any** child condition matches.

```yaml
conditions:
  - type: or
    conditions:
      - type: env
        value: staging
      - type: string
        key: region
        op: eq
        value: us-east-1
```

### Nesting

`and` and `or` can be nested arbitrarily:

```yaml
conditions:
  - type: or
    conditions:
      - type: env
        value: staging
      - type: and
        conditions:
          - type: env
            value: prod
          - type: string
            key: region
            op: eq
            value: us-east-1
```

## Custom conditions

showwhat's condition system is fully extensible — you can register your own condition types with custom evaluator functions. See the [Custom Conditions](/docs/custom-conditions) guide for the full API and examples.
