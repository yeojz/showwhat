---
title: Security
---

# Security Considerations

showwhat assumes **definition authors are trusted** (developers on the integrating team). Definitions are not designed to be authored by untrusted end-users.

## Built-in safeguards

The library applies the following measures by default:

- **No dynamic code execution** — built-in evaluators do not use `eval`, `Function()`, or similar constructs.
- **Property access** — context lookups use `Object.hasOwn()`, preventing prototype chain traversal.
- **Immutable reads** — data retrieval returns `structuredClone()` copies, preventing mutation of internal state.
- **Schema validation** — all definitions are validated through Zod schemas on parse, including regex pattern validity.

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
