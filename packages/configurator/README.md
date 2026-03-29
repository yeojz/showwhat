# @showwhat/configurator

A reusable React component library for visually editing showwhat definitions — like Swagger UI for your flag and config rules.

Provides a complete rule-builder UI while letting your app own storage, workflow, and persistence.

## Installation

```bash
npm install @showwhat/configurator
```

Peer dependencies: React 19, React DOM 19.

## Quick start

```tsx
import { Configurator } from "@showwhat/configurator";
import "@showwhat/configurator/styles.css";

function App() {
  return <Configurator store={myStore} />;
}
```

## Features

- Visual rule builder for all built-in condition types
- Drag-and-drop variation reordering
- Nested AND/OR condition groups
- Condition simulator and JSON context preview
- Store-agnostic — bring your own state management and persistence
- Exports individual components for custom layouts
- shadcn-based UI primitives included
- Tailwind CSS v4 with customisable theme tokens

## Documentation

- [Configurator](https://showwhat.yeojz.dev/docs/configurator) — store interfaces, components, hooks, styling, and examples
