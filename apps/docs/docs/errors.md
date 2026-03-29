---
title: Errors
---

# Errors

All errors extend `ShowwhatError`.

## Per-key errors vs thrown errors

With the new `showwhat()` API, most errors are **returned per-key** inside a `ResolutionError` entry rather than thrown. Only systemic failures (such as context validation) are thrown as exceptions.

```ts
const result = await showwhat({
  keys: ["missing", "checkout_v2"],
  context: { env: "prod" },
  options: { data },
});

const entry = result["missing"];
if (!entry.success) {
  // Per-key error — not thrown, check the error property
  if (entry.error instanceof DefinitionNotFoundError) {
    console.log(entry.error.key); // "missing"
  }
}
```

Systemic errors that prevent resolution entirely are still thrown:

```ts
try {
  await showwhat({ keys: ["checkout_v2"], context: invalid, options: { data } });
} catch (e) {
  // ValidationError is thrown because it is a systemic failure
  if (e instanceof ValidationError) {
    console.log(e.message);
  }
}
```

## Error types

### `DefinitionNotFoundError`

Returned in `ResolutionError` when the requested key does not exist in the data source.

### `DefinitionInactiveError`

Returned in `ResolutionError` when the definition has `active: false`.

### `VariationNotFoundError`

Returned in `ResolutionError` when no variation in the definition matches the context.

### `ConditionError`

Returned in `ResolutionError` when a condition fails to evaluate due to a configuration error — for example, an invalid regex pattern under the active regex engine. This is distinct from a condition that simply does not match.

The `conditionType` property indicates which condition type produced the error (e.g. `"string"`).

### `ValidationError`

Thrown when the context object fails schema validation. This is a systemic error that prevents resolution from starting.

### `ParseError`

Thrown when YAML or JSON parsing fails.

### `SchemaValidationError`

Thrown when parsed definitions fail Zod schema validation.

### `InvalidContextError`

Thrown when context values are invalid for a specific condition evaluation.

### `DataError`

Thrown when the data source encounters an error (file not found, read failure, etc.).

## Error hierarchy

```
ShowwhatError
├── DefinitionNotFoundError
├── DefinitionInactiveError
├── VariationNotFoundError
├── ConditionError
├── ValidationError
├── ParseError
├── SchemaValidationError
├── InvalidContextError
└── DataError
```

## Importing errors

```ts
import {
  ShowwhatError,
  DefinitionNotFoundError,
  DefinitionInactiveError,
  VariationNotFoundError,
  ConditionError,
  ValidationError,
  ParseError,
  SchemaValidationError,
  InvalidContextError,
  DataError,
} from "showwhat";
```

## Related

- [Core API](/docs/core) for `showwhat()` return types and when errors are thrown vs returned
- [Definitions](/docs/definitions) for how definitions and variations are structured
- [Custom Conditions](/docs/custom-conditions) for `ConditionError` scenarios with custom evaluators
- [Custom Data Sources](/docs/custom-data-sources) for `DataError` scenarios
