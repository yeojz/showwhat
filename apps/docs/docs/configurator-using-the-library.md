---
title: Using the Library
outline: [2, 3]
---

# Using the Library

The configurator UI is published as `@showwhat/configurator` — a React component library you can embed in your own applications.

```bash
npm install @showwhat/configurator
```

```ts
import { Configurator } from "@showwhat/configurator";
import "@showwhat/configurator/styles.css";
```

The `Configurator` component accepts a store prop. Your app provides the store implementation — the configurator provides the UI.

```tsx
<Configurator store={yourStore} />
```

See `apps/webapp` in the repository for a complete example using Zustand with localStorage persistence.

## `ConfiguratorStore` interface

All commands are async to support both local and API-backed implementations:

```ts
interface ConfiguratorStore {
  // Read-only reactive state
  definitions: Definitions;
  selectedKey: string | null;
  dirtyKeys: string[];
  revision: number;
  validationErrors: Record<string, ValidationIssue[]>;

  // Queries
  isKeyDirty(key: string): boolean;

  // Commands (all async)
  selectDefinition(key: string | null): Promise<void>;
  addDefinition(key: string): Promise<void>;
  removeDefinition(key: string): Promise<void>;
  renameDefinition(oldKey: string, newKey: string): Promise<void>;
  updateDefinition(key: string, def: Definition): Promise<void>;
  saveDefinition(key: string): Promise<void>;
  discardDefinition(key: string): Promise<void>;
}
```

**State fields:**

| Field              | Type                                | Description                                         |
| ------------------ | ----------------------------------- | --------------------------------------------------- |
| `definitions`      | `Definitions`                       | All definition keys and their current values        |
| `selectedKey`      | `string \| null`                    | The currently selected definition key               |
| `dirtyKeys`        | `string[]`                          | Keys with unsaved local edits                       |
| `revision`         | `number`                            | Increments on every change; used to trigger renders |
| `validationErrors` | `Record<string, ValidationIssue[]>` | Validation issues keyed by definition key           |

**Command methods:**

| Method                             | Description                                     |
| ---------------------------------- | ----------------------------------------------- |
| `isKeyDirty(key)`                  | Returns whether a key has unsaved local edits   |
| `selectDefinition(key)`            | Set the active definition (or null to deselect) |
| `addDefinition(key)`               | Create a new definition with the given key      |
| `removeDefinition(key)`            | Delete a definition                             |
| `renameDefinition(oldKey, newKey)` | Rename a definition key                         |
| `updateDefinition(key, def)`       | Apply an in-progress edit (marks key as dirty)  |
| `saveDefinition(key)`              | Persist the current edits for a key             |
| `discardDefinition(key)`           | Discard local edits and revert to saved state   |

### `ConfiguratorStoreSource`

For reactive stores (Zustand, Redux, etc.), provide a source with `getSnapshot` and `subscribe`. The `Configurator` component uses `useSyncExternalStore` internally, so plain `ConfiguratorStore` objects are also accepted and wrapped automatically.

```ts
interface ConfiguratorStoreSource {
  getSnapshot: () => ConfiguratorStore;
  subscribe: (listener: () => void) => () => void;
}
```

## Store examples

### Minimal in-memory store

For a quick prototype or test, implement `ConfiguratorStore` directly:

```tsx
import { Configurator } from "@showwhat/configurator";
import type { ConfiguratorStore } from "@showwhat/configurator";
import "@showwhat/configurator/styles.css";

const store: ConfiguratorStore = {
  definitions: {},
  selectedKey: null,
  dirtyKeys: [],
  revision: 0,
  validationErrors: {},

  isKeyDirty: () => false,
  selectDefinition: async () => {},
  addDefinition: async (_key) => {
    /* add to definitions */
  },
  removeDefinition: async (_key) => {
    /* remove from definitions */
  },
  renameDefinition: async (_oldKey, _newKey) => {
    /* rename in definitions */
  },
  updateDefinition: async (_key, _def) => {
    /* update in definitions */
  },
  saveDefinition: async () => {},
  discardDefinition: async () => {},
};

function App() {
  return <Configurator store={store} />;
}
```

### Zustand integration

For a reactive store with persistence, wrap a Zustand store as a `ConfiguratorStoreSource`:

```tsx
import { Configurator } from "@showwhat/configurator";
import type { ConfiguratorStoreSource } from "@showwhat/configurator";
import "@showwhat/configurator/styles.css";
import { useMyStore } from "./store";

function App() {
  const storeSource: ConfiguratorStoreSource = {
    getSnapshot: () => useMyStore.getState(),
    subscribe: (listener) => useMyStore.subscribe(listener),
  };

  return <Configurator store={storeSource} />;
}
```

See `apps/webapp` in the repository for a full working example with Zustand, file import/export, and localStorage persistence.

## Components

The library exports individual components for custom layouts:

| Component          | Description                                                   |
| ------------------ | ------------------------------------------------------------- |
| `Configurator`     | Top-level component — sidebar, editor, and preview panel      |
| `DefinitionList`   | Sidebar listing all flag keys with dirty and error indicators |
| `DefinitionEditor` | Editor for a single definition's description and variations   |
| `VariationList`    | Sortable list of variations with drag-and-drop                |
| `VariationCard`    | Single variation editor (value, description, conditions)      |
| `ConditionBuilder` | Visual rule builder for a variation's conditions              |

### Condition editors

The condition builder provides specialised editors for each built-in condition type:

- **string** — key, operator (`eq`/`neq`/`regex`), value(s)
- **number** — key, operator (`eq`/`neq`/`gt`/`gte`/`lt`/`lte`), value
- **datetime** — key, operator, ISO 8601 value
- **bool** — key, value toggle
- **env** — environment value(s)
- **startAt** / **endAt** — datetime pickers
- **AND / OR groups** — nested composite conditions
- **Custom** — raw JSON editor for custom condition types

## Hooks

These hooks are available inside any component rendered within a `<Configurator>`:

| Hook                          | Description                                                                              |
| ----------------------------- | ---------------------------------------------------------------------------------------- |
| `useConfiguratorStore()`      | Get the full current store snapshot (re-renders on any change)                           |
| `useConfiguratorSelector(fn)` | Subscribe to a specific slice; re-renders only when that slice changes (fine-grained)    |
| `useActionState()`            | Track pending/error state of async commands                                              |
| `useStoreRef()`               | Get a stable getter for store methods to use in callbacks without subscribing to changes |

```ts
// Coarse-grained — re-renders whenever anything in the store changes
const store = useConfiguratorStore();

// Fine-grained — re-renders only when selectedKey changes
const selectedKey = useConfiguratorSelector((s) => s.selectedKey);

// Async action state
const { actionState, runAction, clearError } = useActionState();

// Stable ref for event handlers
const getStore = useStoreRef();
const handleClick = () => getStore().saveDefinition(key);
```

## UI primitives

The library re-exports its shadcn-based UI primitives for app shells that want a consistent look:

`Button`, `Input`, `Badge`, `Separator`, `Dialog`, `DropdownMenu`, `Label`, `Select`, `Switch`, `Textarea`, `Popover`, `ScrollArea`, `Tabs`, `ThemeToggle`, `ValueInput`, `DateTimeInput`, `ValidationMessage`, `ConfirmDialog`, `ErrorBoundary`

## Styling

Import the bundled stylesheet in your app entry point:

```css
@import "@showwhat/configurator/styles.css";
```

Or in TypeScript/JavaScript:

```ts
import "@showwhat/configurator/styles.css";
```

The library uses Tailwind CSS v4 with theme tokens defined in CSS `@theme` blocks. To override tokens, define them after the import:

```css
@import "@showwhat/configurator/styles.css";

@theme {
  --color-primary: oklch(55% 0.2 250);
}
```
