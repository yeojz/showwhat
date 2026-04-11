import { useState } from "react";
import { Button, Textarea } from "@showwhat/configurator";
import { ArrowUpCircle, Check, ChevronRight, Loader2, RefreshCw } from "lucide-react";
import { useShallow } from "zustand/react/shallow";
import { usePresetStore } from "../store/preset-store.js";
import type { Presets } from "showwhat";

export function PresetEditor() {
  const { presetYaml, setPresetYaml } = usePresetStore(
    useShallow((s) => ({
      presetYaml: s.presetYaml,
      setPresetYaml: s.setPresetYaml,
    })),
  );

  const [draft, setDraft] = useState(presetYaml);
  const [status, setStatus] = useState<
    { type: "idle" } | { type: "saved" } | { type: "error"; message: string }
  >({ type: "idle" });

  function handleSave() {
    setPresetYaml(draft);
    const storeError = usePresetStore.getState().parseError;
    if (storeError) {
      setPresetYaml(presetYaml);
      setStatus({ type: "error", message: storeError });
    } else {
      setStatus({ type: "saved" });
    }
  }

  const isDirty = draft !== presetYaml;

  return (
    <section>
      <h2 className="text-base font-semibold text-foreground">Preset Overrides</h2>
      <p className="mt-1 text-xs text-muted-foreground">
        Define named preset overrides in YAML or JSON format. These take the highest priority in the
        Configurator. To match this behaviour at runtime, pass the same overrides to{" "}
        <code className="text-[0.7rem] bg-muted px-1 py-0.5 rounded">mergePresets()</code> in your
        application code.
      </p>
      <div className="mt-3 space-y-3">
        <Textarea
          className="min-h-50 font-mono text-sm"
          value={draft}
          placeholder={`# Example:\ntier:\n  type: string\n  key: "tier"\n  overrides:\n    op: eq\n    value: free`}
          onChange={(e) => {
            setDraft(e.target.value);
            setStatus({ type: "idle" });
          }}
        />
        <div className="flex items-center gap-2">
          <Button size="sm" onClick={handleSave} disabled={!isDirty}>
            Save
          </Button>
          {status.type === "error" && <p className="text-xs text-destructive">{status.message}</p>}
          {status.type === "saved" && (
            <p className="text-xs text-green-600 dark:text-green-400">Presets saved.</p>
          )}
        </div>
      </div>
    </section>
  );
}

function formatValue(value: unknown, indent: number): string {
  const pad = " ".repeat(indent);
  if (value === null || value === undefined) return "null";
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  if (Array.isArray(value)) {
    return value
      .map((item) => {
        const formatted = formatValue(item, indent + 2);
        if (typeof item === "object" && item !== null) {
          return `${pad}- ${formatted.trimStart()}`;
        }
        return `${pad}- ${formatted}`;
      })
      .join("\n");
  }
  if (typeof value === "object") {
    return Object.entries(value as Record<string, unknown>)
      .map(([k, v]) => {
        const formatted = formatValue(v, indent + 2);
        if (typeof v === "object" && v !== null) {
          return `${pad}${k}:\n${formatted}`;
        }
        return `${pad}${k}: ${formatted}`;
      })
      .join("\n");
  }
  return String(value);
}

function formatPresetYaml(preset: Presets[string]): string {
  const lines: string[] = [];
  lines.push(`type: ${preset.type}`);
  if (preset.key) {
    lines.push(`key: ${preset.key}`);
  }
  if (preset.overrides && Object.keys(preset.overrides).length > 0) {
    lines.push("overrides:");
    for (const [k, v] of Object.entries(preset.overrides)) {
      const formatted = formatValue(v, 4);
      if (typeof v === "object" && v !== null) {
        lines.push(`  ${k}:\n${formatted}`);
      } else {
        lines.push(`  ${k}: ${formatted}`);
      }
    }
  }
  return lines.join("\n");
}

function InlinePresetRow({
  name,
  preset,
  overridesCustom,
}: {
  name: string;
  preset: Presets[string];
  overridesCustom: boolean;
}) {
  const [open, setOpen] = useState(false);
  const hasDetails = preset.key || (preset.overrides && Object.keys(preset.overrides).length > 0);

  return (
    <div className="rounded-lg border border-border bg-card">
      <button
        type="button"
        className="flex w-full items-center justify-between px-4 py-3 text-left"
        onClick={() => hasDetails && setOpen(!open)}
      >
        <div className="flex items-center gap-3">
          {hasDetails && (
            <ChevronRight
              className={`h-3.5 w-3.5 text-muted-foreground transition-transform ${open ? "rotate-90" : ""}`}
            />
          )}
          {!hasDetails && <span className="w-3.5" />}
          <span className="text-sm font-medium">{name}</span>
          <span className="text-xs text-muted-foreground">{preset.type}</span>
        </div>
        {overridesCustom ? (
          <span title="Overrides a custom preset with the same name">
            <ArrowUpCircle className="h-4 w-4 shrink-0 text-amber-500" />
          </span>
        ) : (
          <span title="Provided by source">
            <Check className="h-4 w-4 shrink-0 text-green-500" />
          </span>
        )}
      </button>
      {open && hasDetails && (
        <div className="border-t border-border px-4 py-3 pl-11">
          <pre className="text-xs text-muted-foreground">{formatPresetYaml(preset)}</pre>
        </div>
      )}
    </div>
  );
}

function PresetGroup({
  label,
  description,
  entries,
  customPresets,
}: {
  label: string;
  description: string;
  entries: [string, Presets[string]][];
  customPresets: Presets;
}) {
  if (entries.length === 0) return null;
  return (
    <div className="space-y-2">
      <div>
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        <p className="text-[11px] text-muted-foreground/70">{description}</p>
      </div>
      <div className="space-y-1.5">
        {entries.map(([name, preset]) => (
          <InlinePresetRow
            key={name}
            name={name}
            preset={preset}
            overridesCustom={name in customPresets}
          />
        ))}
      </div>
    </div>
  );
}

function formatRelativeTime(epoch: number): string {
  const seconds = Math.floor((Date.now() - epoch) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function InlinePresetList({
  sharedPresets,
  loading,
  lastFetched,
  onRefresh,
  overrides,
  isSplit,
  allDefinitionKeys,
  loadedDefinitionKeys,
  keyFilePresets,
}: {
  sharedPresets: Presets;
  loading: boolean;
  lastFetched?: number;
  onRefresh: () => void;
  overrides: Presets;
  isSplit: boolean;
  allDefinitionKeys?: string[];
  loadedDefinitionKeys: string[];
  keyFilePresets?: Record<string, Presets>;
}) {
  const sharedEntries = Object.entries(sharedPresets);

  // Per-key presets for loaded definitions (only unique ones not already in shared)
  const perKeyEntries =
    isSplit && keyFilePresets
      ? Object.entries(keyFilePresets)
          .map(([key, presets]) => {
            const unique: Presets = {};
            for (const [name, def] of Object.entries(presets)) {
              if (!(name in sharedPresets)) {
                unique[name] = def;
              }
            }
            return [key, unique] as const;
          })
          .filter(([, presets]) => Object.keys(presets).length > 0)
      : [];

  const hasAny = sharedEntries.length > 0 || perKeyEntries.length > 0;

  const allEntries = [
    ...sharedEntries,
    ...perKeyEntries.flatMap(([, presets]) => Object.entries(presets)),
  ];
  const hasOverrides =
    hasAny && Object.keys(overrides).length > 0 && allEntries.some(([name]) => name in overrides);

  // For split mode, determine which keys haven't been loaded yet
  const unloadedKeys =
    isSplit && allDefinitionKeys
      ? allDefinitionKeys.filter((k) => !loadedDefinitionKeys.includes(k))
      : [];

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-foreground">From Source</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Presets provided by the active source.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {lastFetched && (
            <span className="text-[10px] text-muted-foreground/60">
              {formatRelativeTime(lastFetched)}
            </span>
          )}
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0 text-muted-foreground"
            disabled={loading}
            onClick={onRefresh}
            title="Refresh presets from source"
          >
            {loading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <RefreshCw className="h-3.5 w-3.5" />
            )}
          </Button>
        </div>
      </div>

      {!hasAny && !loading && (
        <div className="rounded-md border border-dashed border-border px-4 py-6 text-center">
          <p className="text-sm text-muted-foreground">No presets loaded from source.</p>
          <p className="mt-1 text-xs text-muted-foreground/70">
            Load a source that includes presets to see them here.
          </p>
        </div>
      )}

      {hasAny && (
        <div className="space-y-4">
          <PresetGroup
            label={isSplit ? "Presets URL" : "Definition file"}
            description={
              isSplit
                ? "Fetched from the source's dedicated presets endpoint."
                : "Embedded within the loaded definition file."
            }
            entries={sharedEntries}
            customPresets={overrides}
          />
          {perKeyEntries.map(([defKey, presets]) => (
            <PresetGroup
              key={defKey}
              label={defKey}
              description={`Embedded in the "${defKey}" definition file.`}
              entries={Object.entries(presets)}
              customPresets={overrides}
            />
          ))}
        </div>
      )}

      {isSplit && unloadedKeys.length > 0 && (
        <div className="rounded-md border border-dashed border-border px-4 py-4">
          <p className="text-xs font-medium text-muted-foreground">Per-definition presets</p>
          <p className="mt-1 text-xs text-muted-foreground/70">
            Presets embedded in definition files will appear here once loaded from the Definitions
            tab.
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {unloadedKeys.map((key) => (
              <span
                key={key}
                className="inline-block rounded bg-muted/50 px-2 py-0.5 font-mono text-[11px] text-muted-foreground/60"
              >
                {key}
              </span>
            ))}
          </div>
        </div>
      )}

      {hasOverrides && (
        <p className="text-xs text-muted-foreground">
          <ArrowUpCircle className="mr-1 inline h-3 w-3 text-amber-500" />
          Amber icon indicates the source preset overrides a custom preset with the same name.
        </p>
      )}
    </section>
  );
}
