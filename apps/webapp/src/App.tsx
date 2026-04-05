import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Configurator, createPresetUI } from "@showwhat/configurator";
import type { ConfiguratorStoreSource } from "@showwhat/configurator";
import type { Definition } from "showwhat";
import { Toolbar } from "./components/Toolbar.js";
import { EmptyState } from "./components/EmptyState.js";
import { SidebarActions } from "./components/SidebarActions.js";
import { SourceSettings } from "./components/SourceSettings.js";
import { PresetEditor, InlinePresetList } from "./components/PresetSettings.js";
import { useDefinitionStore } from "./store/definition-store.js";
import { usePresetStore } from "./store/preset-store.js";
import { useSourceStore } from "./store/source-store.js";
import { useViewRouter } from "./hooks/useViewRouter.js";
import { useFileExport } from "./hooks/useFileExport.js";

type Theme = "light" | "dark" | "system";

function applyTheme(theme: Theme) {
  const root = document.documentElement;
  if (theme === "system") {
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    root.classList.toggle("dark", prefersDark);
  } else {
    root.classList.toggle("dark", theme === "dark");
  }
}

export function App() {
  const [theme, setTheme] = useState<Theme>(() => {
    const stored = localStorage.getItem("showwhat-theme");
    return stored === "light" || stored === "dark" || stored === "system" ? stored : "system";
  });
  useEffect(() => {
    applyTheme(theme);
    localStorage.setItem("showwhat-theme", theme);

    if (theme !== "system") return;

    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () => applyTheme("system");
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, [theme]);

  const { tab, setTab } = useViewRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dirtyCount = useDefinitionStore((s) => s.dirtyKeys.length);
  const addDefinition = useDefinitionStore((s) => s.addDefinition);

  // Split mode detection (needed before preset merging)
  const activeSourceId = useSourceStore((s) => s.activeSourceId);
  const sources = useSourceStore((s) => s.sources);
  const activeSource = activeSourceId ? sources.find((s) => s.id === activeSourceId) : undefined;
  const isSplit = activeSource?.mode === "split";

  const customPresets = usePresetStore((s) => s.presets);
  const filePresets = useDefinitionStore((s) => s.filePresets);
  const sourcePresets = useDefinitionStore((s) => s.sourcePresets);
  const definitionPresets = useDefinitionStore((s) => s.definitionPresets);

  // Shared presets (custom + source endpoint + file-level) available to all definitions.
  const sharedPresets = useMemo(
    () => ({ ...customPresets, ...filePresets, ...sourcePresets }),
    [customPresets, filePresets, sourcePresets],
  );

  // For bundled mode: all presets merged (no per-definition scoping needed).
  const conditionExtensions = useMemo(() => createPresetUI(sharedPresets), [sharedPresets]);

  // For split mode: each definition sees shared presets + only its own embedded presets.
  const conditionExtensionsResolver = useMemo(() => {
    if (!isSplit) return undefined;
    // Cache resolved extensions per key to avoid re-creating on every render.
    const cache = new Map<string, ReturnType<typeof createPresetUI>>();
    return (key: string) => {
      const cached = cache.get(key);
      const keyPresets = definitionPresets[key] ?? {};
      // Simple identity check — bust cache when reference changes.
      if (cached && (cached as unknown as { _src: unknown })._src === keyPresets) return cached;
      const merged = { ...sharedPresets, ...keyPresets };
      const result = createPresetUI(merged);
      (result as unknown as { _src: unknown })._src = keyPresets;
      cache.set(key, result);
      return result;
    };
  }, [isSplit, sharedPresets, definitionPresets]);

  const storeSource: ConfiguratorStoreSource = useMemo(
    () => ({
      getSnapshot: useDefinitionStore.getState,
      subscribe: useDefinitionStore.subscribe,
    }),
    [],
  );

  // Per-definition export for split mode
  const { exportDefinitionYaml, exportDefinitionJson } = useFileExport();
  const onExportDefinition = useCallback(
    (key: string, definition: Definition, format: "yaml" | "json") => {
      const fn = format === "json" ? exportDefinitionJson : exportDefinitionYaml;
      fn(key, definition);
    },
    [exportDefinitionYaml, exportDefinitionJson],
  );

  useEffect(() => {
    if (dirtyCount === 0) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirtyCount]);

  function handleCreateNew() {
    addDefinition("untitled");
  }

  return (
    <div className="flex h-screen flex-col bg-background text-foreground">
      <Toolbar tab={tab} onTabChange={setTab} theme={theme} onThemeToggle={setTheme} />
      <main className="flex-1 overflow-hidden">
        {tab === "definitions" && (
          <Configurator
            store={storeSource}
            className="h-full"
            conditionExtensions={conditionExtensions}
            conditionExtensionsResolver={conditionExtensionsResolver}
            sidebarHeader={<SidebarActions fileInputRef={fileInputRef} />}
            emptyState={
              <EmptyState onCreateNew={handleCreateNew} onGoToSources={() => setTab("sources")} />
            }
            onExportDefinition={isSplit ? onExportDefinition : undefined}
          />
        )}
        {tab === "sources" && <SourceSettings />}
        {tab === "presets" && (
          <div className="h-full overflow-y-auto">
            <div className="mx-auto max-w-2xl p-8 space-y-8">
              <PresetEditor />
              <InlinePresetList
                filePresets={filePresets}
                sourcePresets={sourcePresets}
                definitionPresets={definitionPresets}
                customPresets={customPresets}
              />
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
