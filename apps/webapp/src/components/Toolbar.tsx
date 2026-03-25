import type React from "react";
import {
  Button,
  ConfirmDialog,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  Badge,
  ThemeToggle,
} from "@showwhat/configurator";
import { Download, Settings, Undo2 } from "lucide-react";
import { useShallow } from "zustand/react/shallow";
import { useFileImport } from "../hooks/useFileImport.js";
import { useFileExport } from "../hooks/useFileExport.js";
import { useDefinitionStore } from "../store/definition-store.js";
import type { Presets } from "@showwhat/core";
import type { Definitions } from "@showwhat/core/schemas";

// ─── Sub-components ──────────────────────────────────────────────────────────

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
            {hasErrors ? "errors" : "unsaved changes"}
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

function ExportMenu({
  canExport,
  savedDefinitions,
  presets,
  sourceFileName,
}: {
  canExport: boolean;
  savedDefinitions: Definitions;
  presets?: Presets;
  sourceFileName: string | null;
}) {
  const { exportYaml, exportJson } = useFileExport();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" disabled={!canExport}>
          <Download className="mr-1.5 h-4 w-4" />
          Export
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuItem
          onClick={() =>
            exportYaml(
              savedDefinitions,
              presets,
              sourceFileName?.replace(/\.json$/, ".yaml") ?? undefined,
            )
          }
        >
          Export as YAML
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() =>
            exportJson(
              savedDefinitions,
              presets,
              sourceFileName?.replace(/\.(yaml|yml)$/, ".json") ?? undefined,
            )
          }
        >
          Export as JSON
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// ─── Main Toolbar ────────────────────────────────────────────────────────────

export function Toolbar({
  fileInputRef,
  theme,
  onThemeToggle,
  onOpenSettings,
}: {
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  theme: "light" | "dark" | "system";
  onThemeToggle: (theme: "light" | "dark" | "system") => void;
  onOpenSettings: () => void;
}) {
  const { importFile, error: importError } = useFileImport();

  const {
    definitions,
    savedDefinitions,
    inlinePresets,
    sourceFileName,
    dirtyKeys,
    validationErrors,
  } = useDefinitionStore(
    useShallow((s) => ({
      definitions: s.definitions,
      savedDefinitions: s.savedDefinitions,
      inlinePresets: s.inlinePresets,
      sourceFileName: s.sourceFileName,
      dirtyKeys: s.dirtyKeys,
      validationErrors: s.validationErrors,
    })),
  );

  const importDefinitions = useDefinitionStore((s) => s.importDefinitions);
  const revertAll = useDefinitionStore((s) => s.revertAll);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const result = await importFile(file);
    if (result) {
      importDefinitions(result.definitions, result.fileName, result.format, result.presets);
    }
    e.target.value = "";
  }

  const definitionCount = Object.keys(definitions).length;
  const hasDirty = dirtyKeys.length > 0;
  const hasErrors = Object.values(validationErrors).some((issues) => issues.length > 0);
  const canExport = !hasDirty && !hasErrors;

  return (
    <div className="flex h-12 items-center gap-2 border-b border-border px-4">
      <img
        src={`${import.meta.env.BASE_URL}logo-v2-b.svg`}
        alt="showwhat"
        className="h-6 w-6 dark:hidden"
      />
      <img
        src={`${import.meta.env.BASE_URL}logo-v2-w.svg`}
        alt="showwhat"
        className="hidden h-6 w-6 dark:block"
      />
      <span className="font-mono text-sm font-semibold">showwhat</span>
      {sourceFileName && (
        <span className="ml-1 text-xs text-muted-foreground">{sourceFileName}</span>
      )}

      <div className="flex-1" />

      {importError && <span className="text-xs text-destructive">{importError.message}</span>}

      <input
        ref={fileInputRef}
        type="file"
        accept=".yaml,.yml,.json"
        className="hidden"
        onChange={handleFileChange}
      />

      {definitionCount > 0 && (
        <>
          <StatusBadge hasErrors={hasErrors} hasDirty={hasDirty} onRevert={revertAll} />
          <ExportMenu
            canExport={canExport}
            savedDefinitions={savedDefinitions}
            presets={inlinePresets}
            sourceFileName={sourceFileName}
          />
        </>
      )}

      <div className="mx-1 h-5 w-px bg-border" />

      <Button
        variant="ghost"
        size="sm"
        className="h-7 w-7 p-0"
        title="Settings"
        onClick={onOpenSettings}
      >
        <Settings className="h-4 w-4" />
      </Button>

      <div className="mx-1 h-5 w-px bg-border" />

      <ThemeToggle theme={theme} onToggle={onThemeToggle} />
    </div>
  );
}
