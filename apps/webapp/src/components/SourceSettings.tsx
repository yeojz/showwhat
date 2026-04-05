import { useRef, useState } from "react";
import {
  Button,
  ConfirmDialog,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@showwhat/configurator";
import { cn } from "@showwhat/configurator";
import { FilePlus2, FileText, Globe, Plus, Unplug } from "lucide-react";
import { useShallow } from "zustand/react/shallow";
import { useDefinitionStore } from "../store/definition-store.js";
import { useSourceStore } from "../store/source-store.js";
import type { HostedSource, SplitSource } from "../store/source-store.js";
import { useSourceFetch } from "../hooks/useSourceFetch.js";
import { useFileImport } from "../hooks/useFileImport.js";
import { SourceFormDialog } from "./SourceForm.js";
import { SourceDetailPanel, ModeBadge, FormatBadge } from "./SourceDetailPanel.js";

// Selection can be: the active source ("__active__"), or a source id from the list
type Selection = "__active__" | string;

export function SourceSettings() {
  const {
    sourceFileName,
    sourceFormat,
    definitions,
    dirtyKeys,
    importDefinitions,
    upsertDefinition,
    clearAll,
  } = useDefinitionStore(
    useShallow((s) => ({
      sourceFileName: s.sourceFileName,
      sourceFormat: s.sourceFormat,
      definitions: s.definitions,
      dirtyKeys: s.dirtyKeys,
      importDefinitions: s.importDefinitions,
      upsertDefinition: s.upsertDefinition,
      clearAll: s.clearAll,
    })),
  );

  // TODO(task-5): replace with presetReader-based approach
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const setSourcePresets = (_presets: Record<string, unknown>) => {};
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const upsertDefinitionPresets = (_key: string, _presets: Record<string, unknown>) => {};

  const {
    sources,
    activeSourceId,
    addSource,
    updateSource,
    removeSource,
    setActiveSource,
    markFetched,
    markListFetched,
    markPresetsFetched,
    setDefinitionKeys,
    addDefinitionKey,
    removeDefinitionKey,
  } = useSourceStore(
    useShallow((s) => ({
      sources: s.sources,
      activeSourceId: s.activeSourceId,
      addSource: s.addSource,
      updateSource: s.updateSource,
      removeSource: s.removeSource,
      setActiveSource: s.setActiveSource,
      markFetched: s.markFetched,
      markListFetched: s.markListFetched,
      markPresetsFetched: s.markPresetsFetched,
      setDefinitionKeys: s.setDefinitionKeys,
      addDefinitionKey: s.addDefinitionKey,
      removeDefinitionKey: s.removeDefinitionKey,
    })),
  );

  const {
    fetchSource,
    reloadKeyList,
    reloadDefinitionKey,
    reloadPresets,
    loading,
    error: fetchError,
  } = useSourceFetch();
  const { importFile, error: fileError } = useFileImport();
  const [formState, setFormState] = useState<"add" | HostedSource | null>(null);
  const [pendingFileImport, setPendingFileImport] = useState<{
    definitions: Parameters<typeof importDefinitions>[0];
    fileName: string;
    format: Parameters<typeof importDefinitions>[2];
    presets?: Parameters<typeof importDefinitions>[3];
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Determine what's active
  const definitionCount = Object.keys(definitions).length;
  const hasAnythingLoaded = !!sourceFileName || definitionCount > 0;
  const isFileSource = !!sourceFileName && !activeSourceId;
  const isUnsavedDraft = !sourceFileName && definitionCount > 0 && !activeSourceId;
  const activeUrlSource = activeSourceId
    ? (sources.find((s) => s.id === activeSourceId) ?? null)
    : null;

  // Default selection: active source if loaded, otherwise first non-active source
  const [selection, setSelection] = useState<Selection>(() => {
    if (hasAnythingLoaded) return "__active__";
    const firstNonActive = sources.find((s) => s.id !== activeSourceId);
    return firstNonActive?.id ?? "__active__";
  });

  // Resolve what to show in the right pane
  const selectedSource =
    selection !== "__active__" ? (sources.find((s) => s.id === selection) ?? null) : null;

  const error = fetchError ?? fileError;

  async function handleLoad(source: HostedSource) {
    const result = await fetchSource(source);
    if (!result) return;

    if (source.mode === "split") {
      // Definitions and presets are managed independently for split sources.
      // Per-key presets are accessed via reader.getPresets(key); sourcePresets from presetsUrl.
      importDefinitions(result.definitions, source.label, source.format);
      setSourcePresets(result.presets ?? {});
    } else {
      // Bundled mode: presets are embedded in the file itself
      importDefinitions(result.definitions, source.label, source.format, result.presets);
    }
    setActiveSource(source.id);
    markFetched(source.id, result.keys);
    setSelection("__active__");
  }

  function handleUnload() {
    clearAll();
    setActiveSource(null);
    // After unload, select first source if any
    setSelection(sources.length > 0 ? sources[0].id : "__active__");
  }

  function handleSaveForm(data: Omit<HostedSource, "id">) {
    const isAdd = formState === "add";
    if (isAdd) {
      const id = addSource(data);
      setSelection(id);
    }
    if (!isAdd && formState) {
      updateSource(formState.id, data);
    }
    setFormState(null);
  }

  function handleDeleteSource(source: HostedSource) {
    if (activeSourceId === source.id) handleUnload();
    removeSource(source.id);
    if (selection === source.id) {
      const remaining = sources.filter((s) => s.id !== source.id);
      setSelection(remaining.length > 0 ? remaining[0].id : "__active__");
    }
  }

  function doFileImport(result: NonNullable<typeof pendingFileImport>) {
    setActiveSource(null);
    setSourcePresets({});
    importDefinitions(result.definitions, result.fileName, result.format, result.presets);
    setSelection("__active__");
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const result = await importFile(file);
    if (result) {
      if (hasAnythingLoaded) {
        setPendingFileImport(result);
      } else {
        doFileImport(result);
      }
    }
    e.target.value = "";
  }

  function handleConfirmFileImport() {
    if (!pendingFileImport) return;
    doFileImport(pendingFileImport);
    setPendingFileImport(null);
  }

  function getRelevantSource(): HostedSource | null {
    return selection === "__active__" ? activeUrlSource : selectedSource;
  }

  async function handleReloadKeyList() {
    const source = getRelevantSource();
    if (!source || source.mode !== "split") return;
    const keys = await reloadKeyList(source as SplitSource);
    if (keys) {
      setDefinitionKeys(source.id, keys);
      markListFetched(source.id);
    }
  }

  async function handleReloadKey(key: string) {
    const source = getRelevantSource();
    if (!source || source.mode !== "split") return;
    const fetched = await reloadDefinitionKey(source as SplitSource, key);
    if (fetched) {
      upsertDefinition(key, fetched.definition);
      if (fetched.filePresets) upsertDefinitionPresets(key, fetched.filePresets);
      markFetched(source.id, [key]);
    }
  }

  async function handleReloadPresets() {
    const source = getRelevantSource();
    if (!source || source.mode !== "split" || !source.presetsUrl) return;
    const presets = await reloadPresets(source.presetsUrl, source.format, source.headers);
    if (presets) {
      setSourcePresets(presets);
      markPresetsFetched(source.id);
    }
  }

  async function handleRefreshSingle() {
    const source = getRelevantSource();
    if (!source || source.mode !== "bundled") return;
    const result = await fetchSource(source);
    if (!result) return;
    importDefinitions(result.definitions, source.label, source.format, result.presets);
    markFetched(source.id, result.keys);
  }

  function handleUpdateHeaders(headers: Record<string, string> | undefined) {
    const source = getRelevantSource();
    if (!source) return;
    updateSource(source.id, { headers });
  }

  // Right pane content
  function renderRightPane() {
    if (selection === "__active__") {
      if (isFileSource) {
        return (
          <div className="flex h-full flex-col">
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <div className="flex items-center gap-2 min-w-0">
                <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                <span className="text-sm font-semibold truncate">{sourceFileName}</span>
                {sourceFormat && <FormatBadge format={sourceFormat} />}
              </div>
              <ConfirmDialog
                title="Unload file source?"
                description="This will remove all definitions and unsaved changes."
                actionLabel="Unload"
                onConfirm={handleUnload}
              >
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-muted-foreground hover:text-foreground"
                >
                  <Unplug className="mr-1 h-3.5 w-3.5" />
                  Unload
                </Button>
              </ConfirmDialog>
            </div>
            <div className="flex-1 flex items-center justify-center">
              <div className="flex flex-col items-center gap-3 text-center px-6">
                <div className="rounded-full border border-border bg-muted/40 p-3">
                  <FileText className="h-5 w-5 text-muted-foreground/60" />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground/80">File source loaded</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Switch to the Definitions tab to edit.
                  </p>
                </div>
              </div>
            </div>
          </div>
        );
      }

      if (activeUrlSource) {
        return (
          <SourceDetailPanel
            source={activeUrlSource}
            isLoaded={true}
            dirtyKeys={dirtyKeys}
            loading={loading}
            onLoad={() => {}}
            onRefreshSingle={handleRefreshSingle}
            onUnload={handleUnload}
            onEdit={() => setFormState(activeUrlSource)}
            onDelete={() => handleDeleteSource(activeUrlSource)}
            onReloadKeyList={handleReloadKeyList}
            onReloadKey={handleReloadKey}
            onReloadPresets={handleReloadPresets}
            onAddKey={(key) => addDefinitionKey(activeUrlSource.id, key)}
            onRemoveKey={(key) => removeDefinitionKey(activeUrlSource.id, key)}
            onUpdateHeaders={handleUpdateHeaders}
          />
        );
      }

      if (isUnsavedDraft) {
        return (
          <div className="flex h-full flex-col">
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <div className="flex items-center gap-2 min-w-0">
                <FilePlus2 className="h-4 w-4 shrink-0 text-muted-foreground" />
                <span className="text-sm font-semibold">Unsaved draft</span>
                <span className="text-xs text-muted-foreground">
                  {definitionCount} definition{definitionCount !== 1 ? "s" : ""}
                </span>
              </div>
              <ConfirmDialog
                title="Discard draft?"
                description="This will remove all definitions. This action cannot be undone."
                actionLabel="Discard"
                onConfirm={handleUnload}
              >
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-destructive/60 hover:text-destructive"
                >
                  Discard
                </Button>
              </ConfirmDialog>
            </div>
            <div className="flex-1 flex items-center justify-center">
              <div className="flex flex-col items-center gap-3 text-center px-6">
                <div className="rounded-full border border-border bg-muted/40 p-3">
                  <FilePlus2 className="h-5 w-5 text-muted-foreground/60" />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground/80">Unsaved definitions</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Created from scratch. Loading a source will replace them.
                  </p>
                </div>
              </div>
            </div>
          </div>
        );
      }

      // Nothing loaded
      return (
        <div className="flex h-full items-center justify-center">
          <div className="flex flex-col items-center gap-3 text-center px-6">
            <div className="rounded-full border border-dashed border-border p-3">
              <Globe className="h-5 w-5 text-muted-foreground/40" />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground/80">No source loaded</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Add a hosted source or import a file to get started.
              </p>
            </div>
          </div>
        </div>
      );
    }

    // A source from the list is selected
    if (selectedSource) {
      return (
        <SourceDetailPanel
          source={selectedSource}
          isLoaded={false}
          dirtyKeys={dirtyKeys}
          loading={loading}
          onLoad={() => handleLoad(selectedSource)}
          onRefreshSingle={handleRefreshSingle}
          onUnload={handleUnload}
          onEdit={() => setFormState(selectedSource)}
          onDelete={() => handleDeleteSource(selectedSource)}
          onReloadKeyList={handleReloadKeyList}
          onReloadKey={handleReloadKey}
          onReloadPresets={handleReloadPresets}
          onAddKey={(key) => addDefinitionKey(selectedSource.id, key)}
          onRemoveKey={(key) => removeDefinitionKey(selectedSource.id, key)}
          onUpdateHeaders={handleUpdateHeaders}
        />
      );
    }

    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-sm text-muted-foreground/60">Select a source from the sidebar</p>
      </div>
    );
  }

  return (
    <div className="flex h-full">
      {/* Left pane */}
      <div className="w-64 shrink-0 border-r border-border bg-muted/30 flex flex-col">
        {/* Active section */}
        <div className="border-b border-border">
          <div className="px-3 pt-3 pb-1">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Active
            </span>
          </div>
          <div className="px-2 pb-2">
            <div className="rounded-md border border-border bg-card">
              {hasAnythingLoaded ? (
                <div
                  className={cn(
                    "flex items-center gap-2 rounded-md px-2 py-2 cursor-pointer",
                    selection === "__active__"
                      ? "bg-accent border-l-2 border-l-primary"
                      : "hover:bg-accent/50",
                  )}
                  onClick={() => setSelection("__active__")}
                >
                  {isUnsavedDraft ? (
                    <FilePlus2
                      className={cn(
                        "h-3.5 w-3.5 shrink-0",
                        selection === "__active__" ? "text-primary" : "text-muted-foreground",
                      )}
                    />
                  ) : isFileSource ? (
                    <FileText
                      className={cn(
                        "h-3.5 w-3.5 shrink-0",
                        selection === "__active__" ? "text-primary" : "text-muted-foreground",
                      )}
                    />
                  ) : (
                    <Globe
                      className={cn(
                        "h-3.5 w-3.5 shrink-0",
                        selection === "__active__" ? "text-primary" : "text-muted-foreground",
                      )}
                    />
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <p className="text-sm font-medium truncate">
                        {isUnsavedDraft
                          ? "Unsaved draft"
                          : isFileSource
                            ? sourceFileName
                            : activeUrlSource?.label}
                      </p>
                    </div>
                    {isUnsavedDraft ? (
                      <p className="text-[10px] text-muted-foreground">
                        {definitionCount} definition{definitionCount !== 1 ? "s" : ""}
                      </p>
                    ) : isFileSource ? (
                      <p className="text-[10px] text-muted-foreground">
                        {sourceFormat?.toUpperCase()}
                      </p>
                    ) : (
                      activeUrlSource && (
                        <div className="flex items-center gap-1 mt-0.5">
                          <ModeBadge mode={activeUrlSource.mode} />
                          <FormatBadge format={activeUrlSource.format} />
                        </div>
                      )
                    )}
                  </div>
                </div>
              ) : (
                <p className="px-2 py-2 text-xs text-muted-foreground">No source loaded</p>
              )}
            </div>
          </div>
        </div>

        {/* Sources list */}
        <div className="flex items-center justify-between px-3 py-3 border-b border-border">
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Sources
          </span>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                <Plus className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setFormState("add")}>
                <Globe className="mr-2 h-4 w-4" />
                From URL
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => fileInputRef.current?.click()}>
                <FileText className="mr-2 h-4 w-4" />
                From file
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept=".yaml,.yml,.json"
          className="hidden"
          onChange={handleFileChange}
        />

        <div className="flex-1 overflow-y-auto px-2 py-2 space-y-1">
          {sources.map((source) => {
            const isActive = activeSourceId === source.id;
            const isSelected = selection === source.id;

            return (
              <div
                key={source.id}
                className={cn(
                  "group flex items-center gap-2 rounded-md px-2 py-2",
                  isActive
                    ? "opacity-40 cursor-default"
                    : isSelected
                      ? "bg-accent border-l-2 border-l-primary cursor-pointer"
                      : "hover:bg-accent/50 cursor-pointer",
                )}
                onClick={isActive ? undefined : () => setSelection(source.id)}
              >
                <Globe
                  className={cn(
                    "h-3.5 w-3.5 shrink-0",
                    isSelected && !isActive ? "text-primary" : "text-muted-foreground",
                  )}
                />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">{source.label}</p>
                  <div className="flex items-center gap-1 mt-0.5">
                    <ModeBadge mode={source.mode} />
                    <FormatBadge format={source.format} />
                  </div>
                </div>
              </div>
            );
          })}

          {sources.length === 0 && (
            <p className="px-2 py-4 text-center text-xs text-muted-foreground">
              No sources configured.
            </p>
          )}
        </div>
      </div>

      {/* Right pane */}
      <div className="flex-1 overflow-hidden">
        {error && (
          <div className="mx-4 mt-4 rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
            {error.message}
            {"failedKeys" in error && (error.failedKeys as string[] | undefined)?.length ? (
              <p className="mt-1 text-xs">
                Failed keys: {(error.failedKeys as string[]).join(", ")}
              </p>
            ) : null}
          </div>
        )}
        {renderRightPane()}
      </div>

      {/* Source form dialog (add/edit) */}
      <SourceFormDialog
        key={formState === "add" ? "add" : (formState?.id ?? "closed")}
        open={formState !== null}
        initial={formState !== "add" && formState !== null ? formState : undefined}
        onSave={handleSaveForm}
        onClose={() => setFormState(null)}
      />

      {/* Confirm file import when something is already loaded */}
      <ConfirmDialog
        title="Replace current source?"
        description={
          dirtyKeys.length > 0
            ? `You have ${dirtyKeys.length} unsaved change(s). Importing a file will unload the current source and discard all unsaved changes. Consider exporting first.`
            : "Importing a file will unload the current source and replace all definitions."
        }
        actionLabel="Import"
        open={pendingFileImport !== null}
        onOpenChange={(open) => {
          if (!open) setPendingFileImport(null);
        }}
        onConfirm={handleConfirmFileImport}
      >
        <span />
      </ConfirmDialog>
    </div>
  );
}
