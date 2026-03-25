# @showwhat/openfeature

[OpenFeature](https://openfeature.dev/) provider for **showwhat** — use showwhat's rule engine through the standard OpenFeature Server SDK.

## Installation

```bash
pnpm add @showwhat/openfeature @openfeature/server-sdk
```

`@openfeature/server-sdk` is a peer dependency (^1.0.0).

## Quick start

```ts
import { OpenFeature } from "@openfeature/server-sdk";
import { ShowwhatProvider } from "@showwhat/openfeature";
import { MemoryData } from "@showwhat/core";

const data = await MemoryData.fromYaml(yamlString);

await OpenFeature.setProviderAndWait(new ShowwhatProvider({ data }));

const client = OpenFeature.getClient();

const enabled = await client.getBooleanValue("checkout_v2", false, {
  env: "production",
});
```

## Features

- All four evaluation types: boolean, string, number, object
- Automatic context mapping from OpenFeature to showwhat
- Custom condition support via `evaluators` option
- Lifecycle management (`initialize` / `onClose`)
- Error mapping to OpenFeature error codes
- Resolution reason tracking

## Documentation

- [OpenFeature Integration](https://showwhat.yeojz.dev/docs/openfeature) — provider options, context mapping, evaluation types, error mapping, and lifecycle
