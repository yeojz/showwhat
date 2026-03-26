---
title: Security
---

# Security Considerations

showwhat assumes **definition authors are trusted** (developers on the integrating team). Definitions are not designed to be authored by untrusted end-users.

## Built-in safeguards

The library applies the following measures by default:

- **No dynamic code execution** - built-in evaluators do not use `eval`, `Function()`, or similar constructs.
- **Property access** - context lookups use `Object.hasOwn()`, preventing prototype chain traversal.
- **Immutable reads** - data retrieval returns `structuredClone()` copies, preventing mutation of internal state.
- **Schema validation** - all definitions are validated through Zod schemas on parse, including regex pattern validity.

## Runtime context and logging

### Application-provided logger

Logging is opt-in. If you provide a `logger`, the library may emit definition keys, resolution outcomes, resolved values, and warnings when unsupported OpenFeature context keys are dropped during context conversion. If those values are sensitive in your environment, consider applying redaction or filtering in your application.

### Resolution metadata

Resolution results include `meta.context`, which contains the evaluation context used for resolution. This can be useful for debugging, but it may also include information you consider sensitive. Avoid forwarding full resolution objects to untrusted clients unless exposing that information is intentional.

## Untrusted definitions

If definitions may come from untrusted sources (e.g. multi-tenant SaaS), validate inputs before storing them. Key areas to consider:

## Regex patterns

String conditions with `op: "regex"` execute patterns via `new RegExp()` without timeout or complexity limits. Patterns like `(a+)+b` can cause catastrophic backtracking (ReDoS). Validate regex complexity before storing definitions.

## Condition nesting depth

`and`/`or` composite conditions are evaluated recursively. The evaluator tracks depth but does not enforce a maximum. A sufficiently deep condition tree may exhaust the call stack. Enforce a nesting depth limit when accepting definitions.

## Schema bounds

Schema arrays and strings have minimum length constraints but no maximum bounds. Enforce upper bounds on string lengths and array sizes when accepting definitions.

## Access control

Which users or systems may create, modify, or deploy definitions is outside the scope of this library. Implement access control in your application layer.
