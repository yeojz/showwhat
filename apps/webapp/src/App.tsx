import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Configurator, createPresetUI, PreviewStateProvider } from "@showwhat/configurator";
import type { ConfiguratorStoreSource } from "@showwhat/configurator";
import { usePreviewStore } from "./store/preview-store.js";
import { mergePresets } from "showwhat";
import type { Definition, Presets, PresetReader } from "showwhat";
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

  const overrides = usePresetStore((s) => s.presets);
  const filePresets = useDefinitionStore((s) => s.filePresets);
  const presetReader = useDefinitionStore((s) => s.presetReader);

  // Build a PresetReader from available sources:
  // - Split mode: presetReader is set (handles presetsUrl + per-key file presets)
  // - Bundled/file mode: presetReader is null, wrap filePresets as a simple reader
  const effectiveReader = useMemo((): PresetReader | undefined => {
    if (presetReader) return presetReader;
    if (Object.keys(filePresets).length === 0) return undefined;
    return { getPresets: async () => filePresets };
  }, [presetReader, filePresets]);

  // Resolve merged presets (async → state)
  const [resolvedPresets, setResolvedPresets] = useState<Presets>({});
  const [resolvedKeyPresets, setResolvedKeyPresets] = useState<Record<string, Presets>>({});

  useEffect(() => {
    let cancelled = false;
    mergePresets({ presets: effectiveReader, overrides }).then((result) => {
      if (!cancelled) setResolvedPresets(result);
    });
    return () => {
      cancelled = true;
    };
  }, [effectiveReader, overrides]);

  const conditionExtensions = useMemo(() => createPresetUI(resolvedPresets), [resolvedPresets]);

  const conditionExtensionsResolver = useMemo(() => {
    if (!isSplit) return undefined;
    const cache = new Map<
      string,
      { presets: Presets; extensions: ReturnType<typeof createPresetUI> }
    >();
    return (key: string) => {
      const cached = cache.get(key);
      const keyPresets = resolvedKeyPresets[key];
      if (cached && cached.presets === keyPresets) return cached.extensions;

      // Trigger async resolution for this key if not yet resolved
      if (!keyPresets) {
        mergePresets({ key, presets: effectiveReader, overrides }).then((result) => {
          setResolvedKeyPresets((prev) => ({ ...prev, [key]: result }));
        });
        // Return shared presets as fallback until key-specific ones resolve
        return createPresetUI(resolvedPresets);
      }

      const extensions = createPresetUI(keyPresets);
      cache.set(key, { presets: keyPresets, extensions });
      return extensions;
    };
  }, [isSplit, effectiveReader, overrides, resolvedPresets, resolvedKeyPresets]);

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
            />
          </PreviewStateProvider>
        )}
        {tab === "sources" && <SourceSettings />}
        {tab === "presets" && (
          <div className="h-full overflow-y-auto">
            <div className="mx-auto max-w-2xl p-8 space-y-8">
              <PresetEditor />
              <InlinePresetList
                presetReader={effectiveReader}
                overrides={overrides}
                definitionKeys={definitionKeysList}
                isSplit={isSplit}
              />
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
