---
title: Errors
---

# Errors

All errors extend `ShowwhatError`.

## Error types

### `DefinitionNotFoundError`

Thrown when the requested key does not exist in the data source.

```ts
try {
  await showwhat({ key: "missing", context: {}, options: { data } });
} catch (e) {
  if (e instanceof DefinitionNotFoundError) {
    console.log(e.key); // "missing"
    console.log(e.context); // {}
  }
}
```

### `DefinitionInactiveError`

Thrown when the definition has `active: false`.

### `VariationNotFoundError`

Thrown when no variation in the definition matches the context.

### `ValidationError`

Thrown when the context object fails schema validation.

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
  ValidationError,
  ParseError,
  SchemaValidationError,
  InvalidContextError,
  DataError,
} from "showwhat";
```
