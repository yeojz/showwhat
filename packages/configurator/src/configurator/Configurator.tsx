import { useMemo } from "react";
import type { Definition } from "showwhat";
import { DefinitionList } from "@/components/definition-list/DefinitionList.js";
import { DefinitionEditor } from "@/components/definition-editor/DefinitionEditor.js";
import { ErrorBoundary } from "@/components/common/ErrorBoundary.js";
import {
  StoreSourceContext,
  ActionStateContext,
  useActionRunner,
  useActionState,
  useStoreRef,
} from "./context.js";
import { useConfiguratorSelector } from "./useConfiguratorSelector.js";
import { PreviewPanel } from "./PreviewPanel.js";
import type { ConfiguratorStore, ConfiguratorStoreSource } from "./types.js";
import {
  selectDefinitions,
  selectSelectedKey,
  selectValidationErrors,
  selectDirtyKeys,
  selectRevision,
} from "./selectors.js";
import type { ConditionExtensions } from "@/components/condition-builder/ConditionExtensionsContext.js";
import { ConditionExtensionsProvider } from "@/components/condition-builder/ConditionExtensionsContext.js";
import type { ConditionEvaluator } from "showwhat";
import { FallbackEvaluatorProvider } from "./fallback-context.js";

/**
 * Normalize a plain ConfiguratorStore into a ConfiguratorStoreSource.
 * When the store is a plain object (no subscribe/getSnapshot), we wrap it
 * in a trivial source whose snapshot is the object itself. The subscribe
 * callback is a no-op because React context changes already trigger rerenders.
 *
 * **Plain-store limitation:** Because `subscribe` is a no-op, React's
 * `useSyncExternalStore` cannot detect granular changes. Every new plain-store
 * reference produces a new source, which updates `StoreSourceContext` and
 * re-renders **all** consumers — selector-level granularity is defeated.
 * For production use cases that need fine-grained updates, provide a real
 * `ConfiguratorStoreSource` (e.g. a Zustand store) directly instead of a
 * plain object.
 */
function useNormalizedSource(
  store: ConfiguratorStore | ConfiguratorStoreSource,
): ConfiguratorStoreSource {
  return useMemo(() => {
    // If the store already satisfies the source interface, use it directly.
    if (isStoreSource(store)) {
      return store;
    }

    // Wrap a plain store object in a trivial source.
    // The memo dep is `store` itself, so every new plain-store reference
    // produces a new source, which updates StoreSourceContext and triggers
    // consumer rerenders.  This is correct: plain stores are prop-driven
    // and don't support selector-level granularity.  Use a
    // ConfiguratorStoreSource with a real subscribe for that.
    const snapshot = store;
    return {
      getSnapshot: () => snapshot,
      subscribe: () => () => {},
    };
  }, [store]);
}

function isStoreSource(obj: unknown): obj is ConfiguratorStoreSource {
  return (
    typeof obj === "object" &&
    obj !== null &&
    "getSnapshot" in obj &&
    "subscribe" in obj &&
    typeof (obj as ConfiguratorStoreSource).getSnapshot === "function" &&
    typeof (obj as ConfiguratorStoreSource).subscribe === "function"
  );
}

function ErrorBanner() {
  const { actionState, clearError } = useActionState();
  if (!actionState.error) return null;
  return (
    <div
      role="alert"
      className="flex items-center justify-between border-b border-destructive/30 bg-destructive/10 px-4 py-2"
    >
      <p className="text-xs font-medium text-destructive">
        Action failed: {actionState.error.message}
      </p>
      <button type="button" className="text-xs text-destructive underline" onClick={clearError}>
        Dismiss
      </button>
    </div>
  );
}

function EditorLayout({ emptyState }: { emptyState?: React.ReactNode }) {
  const definitions = useConfiguratorSelector(selectDefinitions);
  const selectedKey = useConfiguratorSelector(selectSelectedKey);
  const validationErrors = useConfiguratorSelector(selectValidationErrors);
  const dirtyKeys = useConfiguratorSelector(selectDirtyKeys);
  const revision = useConfiguratorSelector(selectRevision);
  const getStore = useStoreRef();
  const { actionState, runAction } = useActionState();

  const selectedDefinition = selectedKey ? definitions[selectedKey] : null;

  if (Object.keys(definitions).length === 0 && emptyState) {
    return <>{emptyState}</>;
  }

  return (
    <div className="flex h-full flex-col">
      <ErrorBanner />

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <div className="w-72 shrink-0 border-r border-border bg-muted/30">
          <DefinitionList
            definitions={definitions}
            selectedKey={selectedKey}
            validationErrors={validationErrors}
            dirtyKeys={dirtyKeys}
            onSelect={(key) => {
              runAction(() => getStore().selectDefinition(key)).catch(() => {});
            }}
            onAdd={(key) => runAction(() => getStore().addDefinition(key))}
            onRemove={(key) => {
              runAction(() => getStore().removeDefinition(key)).catch(() => {});
            }}
          />
        </div>

        {/* Editor */}
        <div className="flex-1 overflow-hidden bg-background">
          <ErrorBoundary>
            {selectedDefinition && selectedKey ? (
              <div key={`anim-${selectedKey}-${revision}`} className="h-full animate-fade-up">
                <DefinitionEditor
                  key={`${selectedKey}-${revision}`}
                  definitionKey={selectedKey}
                  definition={selectedDefinition}
                  validationErrors={validationErrors[selectedKey]}
                  isDirty={dirtyKeys.includes(selectedKey)}
                  isPending={actionState.pending}
                  onUpdate={(def: Definition) => {
                    getStore()
                      .updateDefinition(selectedKey, def)
                      .catch(() => {});
                  }}
                  onRename={(newKey: string) =>
                    runAction(() => getStore().renameDefinition(selectedKey, newKey))
                  }
                  onSave={() => {
                    runAction(() => getStore().saveDefinition(selectedKey)).catch(() => {});
                  }}
                  onDiscard={() => {
                    runAction(() => getStore().discardDefinition(selectedKey)).catch(() => {});
                  }}
                />
              </div>
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                Select a definition to edit
              </div>
            )}
          </ErrorBoundary>
        </div>

        {/* Preview */}
        <ErrorBoundary>
          <PreviewPanel />
        </ErrorBoundary>
      </div>
    </div>
  );
}

export function Configurator({
  store,
  className,
  emptyState,
  conditionExtensions,
  fallbackEvaluator,
}: {
  store: ConfiguratorStore | ConfiguratorStoreSource;
  className?: string;
  emptyState?: React.ReactNode;
  conditionExtensions?: ConditionExtensions;
  fallbackEvaluator?: ConditionEvaluator;
}) {
  const runner = useActionRunner();
  const storeSource = useNormalizedSource(store);

  return (
    <StoreSourceContext.Provider value={storeSource}>
      <ActionStateContext.Provider value={runner}>
        <ConditionExtensionsProvider value={conditionExtensions ?? null}>
          <FallbackEvaluatorProvider value={fallbackEvaluator ?? null}>
            <div className={className}>
              <EditorLayout emptyState={emptyState} />
            </div>
          </FallbackEvaluatorProvider>
        </ConditionExtensionsProvider>
      </ActionStateContext.Provider>
    </StoreSourceContext.Provider>
  );
}
