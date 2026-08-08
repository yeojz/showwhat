---
title: AI-Assisted Workflows
---

# Feature flags in AI-assisted workflows

**The flag is in the diff.**

When an AI agent ships code behind a feature flag, the flag should ship in the same pull request as the code it gates. showwhat makes that the default: a flag is a few lines of YAML next to the code, not a record in a dashboard.

```diff
 definitions:
+  checkout_v2:
+    variations:
+      - value: true
+        conditions:
+          - type: env
+            value: staging
+      - value: false
```

One diff. The reviewer sees the feature _and_ the switch that guards it, and `git revert` removes both together.

## Why a file beats a dashboard for agents

### One diff, one review, one revert

Dashboard-managed flags split an agent's change in half: the code lands in the pull request, while the flag lives in a web console that code review never sees. With showwhat, the whole change — code, flag, targeting rules — is a single reviewable, revertable diff.

### No production credentials in the agent's hands

Driving a flag platform means giving the agent a write-scoped API token to production configuration. With showwhat, the agent's write access _is_ a pull request. Branch protection, required reviews, and CI — controls you already run — are the guardrails, and nothing the agent writes takes effect until a human merges it.

### Schema-checked, not vibe-checked

Definitions are validated with Zod, so a malformed flag fails in CI before a human ever reads the diff. Agents do well with a typed, lintable target format — and a one-line test keeps them honest:

```ts
import { readFileSync } from "node:fs";
import { MemoryData } from "showwhat";

test("flag definitions are valid", async () => {
  await MemoryData.fromYaml(readFileSync("flags.yaml", "utf8"));
});
```

### Your audit log is `git log`

Who changed which flag, when, and why — including the agent's stated reasoning in the commit message and PR thread. No separate audit tier, no vendor retention policy.

### Deterministic and testable in CI

Evaluation is a pure in-process function, so an agent can assert the behavior of the flag it just added — no mocked flag service, no network in the test:

```ts
import { showwhat, MemoryData } from "showwhat";

test("checkout_v2 is enabled on staging only", async () => {
  const data = await MemoryData.fromYaml(readFileSync("flags.yaml", "utf8"));

  const staging = await showwhat({
    keys: ["checkout_v2"],
    context: { env: "staging" },
    options: { data },
  });
  const prod = await showwhat({
    keys: ["checkout_v2"],
    context: { env: "prod" },
    options: { data },
  });

  expect(staging["checkout_v2"].success && staging["checkout_v2"].value).toBe(true);
  expect(prod["checkout_v2"].success && prod["checkout_v2"].value).toBe(false);
});
```

## Ground rules for agent-authored flags

A short checklist worth adding to your agent instructions (`CLAUDE.md`, `AGENTS.md`, or similar):

- Every new code path ships behind a flag defined in the same PR.
- The last variation must be an unconditional default, and new flags default to **off** in production.
- Add or update the validation test when definitions change.
- To retire a flag, remove the definition and the code it gated in one PR — the diff _is_ the cleanup record.

## Related

- [How showwhat compares](/docs/comparison) — where a spec-first approach fits among flag platforms
- [Deploying to the edge](/docs/deploy-edge) — shipping definitions inside your deploy artifact
- [OpenFeature](/docs/openfeature) — keeping application code vendor-neutral
