---
title: Deploying to the Edge
---

# Deploying to the edge

showwhat's core has no Node-specific dependencies, so the same engine that runs on your servers runs on edge platforms such as Cloudflare Workers, Deno Deploy, and Vercel Edge Functions. This guide uses Cloudflare Workers; every pattern applies to the other runtimes.

The key idea: **definitions are an artifact, not a service.** Ship them with your code and evaluation is in-process — no per-request network call, nothing to download, no SDK state to warm up.

## Pattern A: bundle definitions with the Worker

Import the definition file at build time. Wrangler can import YAML as text with a `Text` module rule (or keep definitions in JSON and use a plain import).

::: code-group

```toml [wrangler.toml]
name = "my-worker"
main = "src/index.ts"

[[rules]]
type = "Text"
globs = ["**/*.yaml"]
fallthrough = true
```

```ts [src/index.ts]
import { showwhat, MemoryData } from "showwhat";
import flagsYaml from "./flags.yaml";

// Module scope: parsed once per isolate, reused across requests
const data = MemoryData.fromYaml(flagsYaml);

export default {
  async fetch(request: Request): Promise<Response> {
    const results = await showwhat({
      keys: ["checkout_v2"],
      context: { env: "prod" }, // build context from the request as needed
      options: { data: await data },
    });

    const entry = results["checkout_v2"];
    const enabled = entry.success ? entry.value : false;
    return new Response(`checkout_v2: ${enabled}`);
  },
};
```

```yaml [src/flags.yaml]
definitions:
  checkout_v2:
    variations:
      - value: true
        conditions:
          - type: env
            value: prod
      - value: false
```

```ts [src/types.d.ts]
declare module "*.yaml" {
  const content: string;
  export default content;
}
```

:::

A note on cold starts: edge isolates are short-lived, which is why SDKs that download rule sets from a remote service pay a re-initialization cost whenever an isolate is evicted. Bundled definitions sidestep this entirely — a cold start re-parses a small local file, with zero network calls in the path. Flag changes go out the same way code changes do: commit, review, deploy.

## Pattern B: serve definitions from your own storage

To change flags without redeploying the Worker, store the definition file in Workers KV (or any storage you control) and cache the parsed result at module scope.

```ts
import { showwhat, MemoryData } from "showwhat";

interface Env {
  FLAGS: KVNamespace;
}

let cached: { data: MemoryData; at: number } | undefined;
const TTL_MS = 60_000;

async function getData(env: Env): Promise<MemoryData> {
  if (cached && Date.now() - cached.at < TTL_MS) return cached.data;
  const yaml = await env.FLAGS.get("flags.yaml");
  if (!yaml) throw new Error("definitions not found in KV");
  cached = { data: await MemoryData.fromYaml(yaml), at: Date.now() };
  return cached.data;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const results = await showwhat({
      keys: ["checkout_v2"],
      context: { env: "prod" },
      options: { data: await getData(env) },
    });

    const entry = results["checkout_v2"];
    return Response.json({ checkout_v2: entry.success ? entry.value : false });
  },
};
```

Write to KV from CI so the repository stays the source of truth:

```bash
wrangler kv key put --binding FLAGS flags.yaml --path ./src/flags.yaml
```

Trade-off: KV reads are eventually consistent and the module-scope cache adds up to `TTL_MS` of staleness. For most rollouts that is fine; for kill switches, keep the TTL short — or use Pattern A, where a redeploy is the switch.

## Other runtimes

The same two patterns work anywhere your bundle runs:

- **Deno Deploy** — import a JSON definition file directly, or read the YAML at startup with `Deno.readTextFile`.
- **Vercel Edge Functions / Netlify Edge** — bundle the definition file and parse it at module scope.
- **AWS Lambda / traditional servers** — identical code; the parsed `MemoryData` persists for the lifetime of the process or execution environment.

Because evaluation is a pure in-process function, the code path you deploy to the edge is the same one you exercise in unit tests and CI — no emulator, no mocked flag service.

::: tip Local everywhere
Local evaluation isn't a platform feature — it's a consequence of where your flags live. When definitions ship with your code, every runtime is local. See [how showwhat compares](/docs/comparison#edge-feature-flag-services).
:::
