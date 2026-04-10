import { useState } from "react";
import type React from "react";
import {
  Badge,
  Button,
  ConfirmDialog,
  Menu,
  MenuContent,
  MenuItem,
  MenuTrigger,
} from "@showwhat/configurator";
import { Download, Undo2 } from "lucide-react";
import { useShallow } from "zustand/react/shallow";
import { useFileImport } from "../hooks/useFileImport.js";
import { useFileExport } from "../hooks/useFileExport.js";
import { useDefinitionStore } from "../store/definition-store.js";
import { useSourceStore } from "../store/source-store.js";

function StatusBadge({
  hasErrors,
  hasDirty,
  onRevert,
}: {
  hasErrors: boolean;
  hasDirty: boolean;
  onRevert: () => void;
}) {
  const badgeClassName = hasErrors
    ? "border-destructive/40 bg-destructive/10 text-destructive"
    : hasDirty
      ? "border-amber-400/40 bg-amber-400/10 text-amber-600 dark:text-amber-400"
      : "border-status-active/40 bg-status-active/10 text-green-700 dark:text-green-400";

  if (hasDirty) {
    return (
      <ConfirmDialog
        title="Revert all changes?"
        description="This will discard all unsaved changes and restore definitions to their last saved state. This action cannot be undone."
        actionLabel="Revert"
        onConfirm={onRevert}
      >
        <button type="button" title="Revert all changes">
          <Badge variant="outline" className={`${badgeClassName} cursor-pointer`}>
            {hasErrors ? "errors" : "unsaved"}
            <Undo2 className="h-3 w-3" />
          </Badge>
        </button>
      </ConfirmDialog>
    );
  }

  return (
    <Badge variant="outline" className={badgeClassName}>
      {hasErrors ? "errors" : "ready"}
    </Badge>
  );
}

export function SidebarActions({
  fileInputRef,
}: {
  fileInputRef: React.RefObject<HTMLInputElement | null>;
}) {
  const { importFile, error: importError } = useFileImport();
  const { exportYaml, exportJson } = useFileExport();

  const {
    definitions,
    savedDefinitions,
    filePresets,
    sourceFileName,
    dirtyKeys,
    validationErrors,
  } = useDefinitionStore(
    useShallow((s) => ({
      definitions: s.definitions,
      savedDefinitions: s.savedDefinitions,
      filePresets: s.filePresets,
      sourceFileName: s.sourceFileName,
      dirtyKeys: s.dirtyKeys,
      validationErrors: s.validationErrors,
    })),
  );

  const importDefinitions = useDefinitionStore((s) => s.importDefinitions);
  const revertAll = useDefinitionStore((s) => s.revertAll);

  const { activeSourceId, sources, setActiveSource } = useSourceStore(
    useShallow((s) => ({
      activeSourceId: s.activeSourceId,
      sources: s.sources,
      setActiveSource: s.setActiveSource,
    })),
  );

  const activeSource = activeSourceId ? sources.find((s) => s.id === activeSourceId) : undefined;
  const isSplit = activeSource?.mode === "split";
  const hasAnythingLoaded = !!sourceFileName;

  const [pendingFileImport, setPendingFileImport] = useState<{
    definitions: Parameters<typeof importDefinitions>[0];
    fileName: string;
    format: Parameters<typeof importDefinitions>[2];
    presets?: Parameters<typeof importDefinitions>[3];
  } | null>(null);

  function doFileImport(result: NonNullable<typeof pendingFileImport>) {
    setActiveSource(null);
    importDefinitions(result.definitions, result.fileName, result.format, result.presets);
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

  const definitionCount = Object.keys(definitions).length;
  const hasDirty = dirtyKeys.length > 0;
  const hasErrors = Object.values(validationErrors).some(
    (issues) => (issues as unknown[]).length > 0,
  );
  const canExport = !hasDirty && !hasErrors;

  return (
    <div className="flex h-12 items-center gap-2 border-b border-border px-3">
      <input
        ref={fileInputRef}
        type="file"
        accept=".yaml,.yml,.json"
        className="hidden"
        onChange={handleFileChange}
      />

      {definitionCount > 0 ? (
        <StatusBadge hasErrors={hasErrors} hasDirty={hasDirty} onRevert={revertAll} />
      ) : (
        <Badge
          variant="outline"
          className="border-muted-foreground/40 bg-muted/10 text-muted-foreground"
        >
          idle
        </Badge>
      )}

      {importError && <span className="text-xs text-destructive">{importError.message}</span>}

      <div className="flex-1" />

      {definitionCount > 0 && !isSplit && (
        <Menu>
          <MenuTrigger
            render={
              <Button variant="ghost" size="sm" className="h-7 px-2" disabled={!canExport}>
                <Download className="mr-1 h-3.5 w-3.5" />
                <span className="text-xs">Export</span>
              </Button>
            }
          />
          <MenuContent>
            <MenuItem onClick={() => exportYaml(savedDefinitions, filePresets)}>
              Export as YAML
            </MenuItem>
            <MenuItem onClick={() => exportJson(savedDefinitions, filePresets)}>
              Export as JSON
            </MenuItem>
          </MenuContent>
        </Menu>
      )}

      <ConfirmDialog
        title="Replace current source?"
        description={
          hasDirty
            ? `You have ${dirtyKeys.length} unsaved change(s). Importing a file will unload the current source and discard all unsaved changes. Consider exporting first.`
            : "Importing a file will unload the current source and replace all definitions."
        }
        actionLabel="Import"
        open={pendingFileImport !== null}
        onOpenChange={(open: boolean) => {
          if (!open) setPendingFileImport(null);
        }}
        onConfirm={handleConfirmFileImport}
      >
        <span />
      </ConfirmDialog>
    </div>
  );
}
