import { useEffect, useMemo, useRef, useState } from "react";
import { Configurator, createPresetUI } from "@showwhat/configurator";
import type { ConfiguratorStoreSource } from "@showwhat/configurator";
import { Toolbar } from "./components/Toolbar.js";
import { EmptyState } from "./components/EmptyState.js";
import { SettingsPage } from "./components/SettingsPage.js";
import { useDefinitionStore } from "./store/definition-store.js";
import { usePresetStore } from "./store/preset-store.js";
import { useViewRouter } from "./hooks/useViewRouter.js";

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

  const { view, tab, navigate } = useViewRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dirtyCount = useDefinitionStore((s) => s.dirtyKeys.length);
  const addDefinition = useDefinitionStore((s) => s.addDefinition);

  const configuratorPresets = usePresetStore((s) => s.presets);
  const inlinePresets = useDefinitionStore((s) => s.inlinePresets);
  const mergedPresets = useMemo(
    () => ({ ...configuratorPresets, ...inlinePresets }),
    [configuratorPresets, inlinePresets],
  );
  const conditionExtensions = useMemo(() => createPresetUI(mergedPresets), [mergedPresets]);

  const storeSource: ConfiguratorStoreSource = useMemo(
    () => ({
      getSnapshot: useDefinitionStore.getState,
      subscribe: useDefinitionStore.subscribe,
    }),
    [],
  );

  useEffect(() => {
    if (dirtyCount === 0) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirtyCount]);

  function handleImportClick() {
    fileInputRef.current?.click();
  }

  function handleCreateNew() {
    addDefinition("untitled");
  }

  return (
    <div className="flex h-screen flex-col bg-background text-foreground">
      {view === "configurator" && (
        <>
          <Toolbar
            fileInputRef={fileInputRef}
            theme={theme}
            onThemeToggle={setTheme}
            onOpenSettings={() => navigate({ view: "settings" })}
          />
          <main className="flex-1 overflow-hidden">
            <Configurator
              store={storeSource}
              className="h-full"
              conditionExtensions={conditionExtensions}
              emptyState={
                <EmptyState onCreateNew={handleCreateNew} onImportClick={handleImportClick} />
              }
            />
          </main>
        </>
      )}
      {view === "settings" && (
        <SettingsPage
          tab={tab}
          onTabChange={(t) => navigate({ view: "settings", tab: t })}
          onBack={() => navigate({ view: "configurator" })}
        />
      )}
    </div>
  );
}
