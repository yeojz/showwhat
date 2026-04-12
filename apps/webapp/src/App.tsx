import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Configurator, PreviewStateProvider } from "@showwhat/configurator";
import type { ConfiguratorStoreSource } from "@showwhat/configurator";
import { usePreviewStore } from "./store/preview-store.js";
import type { Definition } from "showwhat";
import { Toolbar } from "./components/Toolbar.js";
import { EmptyState } from "./components/EmptyState.js";
import { SidebarActions } from "./components/SidebarActions.js";
import { SourceSettings } from "./components/SourceSettings.js";
import { PresetEditor, InlinePresetList } from "./components/PresetSettings.js";
import { useDefinitionStore } from "./store/definition-store.js";
import { useSourceStore } from "./store/source-store.js";
import { useViewRouter } from "./hooks/useViewRouter.js";

import { useFileExport } from "./hooks/useFileExport.js";
import { usePresetOrchestrator } from "./hooks/usePresetOrchestrator.js";

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
  const definitionKeys = useDefinitionStore((s) => Object.keys(s.definitions).join("\0"));
  const definitionKeysList = useMemo(
    () => (definitionKeys ? definitionKeys.split("\0") : []),
    [definitionKeys],
  );

  // Split mode detection (needed before preset merging)
  const activeSourceId = useSourceStore((s) => s.activeSourceId);
  const sources = useSourceStore((s) => s.sources);
  const activeSource = activeSourceId ? sources.find((s) => s.id === activeSourceId) : undefined;
  const isSplit = activeSource?.mode === "split";
  const splitDefinitionKeys =
    isSplit && activeSource?.mode === "split" ? activeSource.definitionKeys : undefined;

  const {
    conditionExtensions,
    conditionExtensionsResolver,
    sourcePresets,
    keyFilePresets,
    sourcePresetsLastFetched,
    sourcePresetsLoading,
    overrides,
    refreshSourcePresets,
    loadDefinitionKey,
    loadingDefinition,
  } = usePresetOrchestrator();

  const handleBeforeSelect = useCallback(
    async (key: string) => {
      if (!isSplit || !activeSource || activeSource.mode !== "split") return;
      await loadDefinitionKey(activeSource, key, { skipIfLoaded: true });
    },
    [isSplit, activeSource, loadDefinitionKey],
  );

  const handleRefreshDefinition = useCallback(
    async (key: string) => {
      if (!isSplit || !activeSource || activeSource.mode !== "split") return;
      await loadDefinitionKey(activeSource, key);
    },
    [isSplit, activeSource, loadDefinitionKey],
  );

  const previewState = usePreviewStore();

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
          <PreviewStateProvider value={previewState}>
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
              definitionKeys={splitDefinitionKeys}
              onBeforeSelect={isSplit ? handleBeforeSelect : undefined}
              onRefreshDefinition={isSplit ? handleRefreshDefinition : undefined}
              isLoadingDefinition={loadingDefinition}
            />
          </PreviewStateProvider>
        )}
        {tab === "sources" && <SourceSettings loadDefinitionKey={loadDefinitionKey} />}
        {tab === "presets" && (
          <div className="h-full overflow-y-auto">
            <div className="mx-auto max-w-2xl p-8 space-y-8">
              <PresetEditor />
              <InlinePresetList
                sharedPresets={sourcePresets}
                loading={sourcePresetsLoading}
                lastFetched={sourcePresetsLastFetched}
                onRefresh={refreshSourcePresets}
                overrides={overrides}
                isSplit={isSplit}
                allDefinitionKeys={splitDefinitionKeys}
                loadedDefinitionKeys={definitionKeysList}
                keyFilePresets={keyFilePresets}
              />
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
