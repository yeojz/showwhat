import { useState } from "react";
import { Button, Textarea } from "@showwhat/configurator";
import { ArrowUpCircle, Check, ChevronRight } from "lucide-react";
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
      <h2 className="text-base font-semibold text-foreground">Custom Presets</h2>
      <p className="mt-1 text-xs text-muted-foreground">
        Define named condition presets in YAML or JSON format.
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

export function InlinePresetList({
  filePresets,
  sourcePresets,
  definitionPresets,
  customPresets,
}: {
  filePresets: Presets;
  sourcePresets: Presets;
  definitionPresets: Record<string, Presets>;
  customPresets: Presets;
}) {
  const fileEntries = Object.entries(filePresets);
  const sourceEntries = Object.entries(sourcePresets);
  const definitionEntries = Object.entries(definitionPresets);
  const allDefinitionPresetEntries = definitionEntries.flatMap(([, presets]) =>
    Object.entries(presets),
  );
  const hasAny =
    fileEntries.length > 0 || sourceEntries.length > 0 || allDefinitionPresetEntries.length > 0;
  const hasOverrides =
    hasAny &&
    Object.keys(customPresets).length > 0 &&
    [...fileEntries, ...sourceEntries, ...allDefinitionPresetEntries].some(
      ([name]) => name in customPresets,
    );

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-base font-semibold text-foreground">From Source</h2>
        <p className="mt-1 text-xs text-muted-foreground">Presets provided by the active source.</p>
      </div>

      {!hasAny && (
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
            label="Presets URL"
            description="Fetched from the source's dedicated presets endpoint."
            entries={sourceEntries}
            customPresets={customPresets}
          />
          <PresetGroup
            label="Definition file"
            description="Embedded within the loaded definition file."
            entries={fileEntries}
            customPresets={customPresets}
          />
          {definitionEntries.map(([defKey, presets]) => (
            <PresetGroup
              key={defKey}
              label={defKey}
              description={`Embedded in the "${defKey}" definition file.`}
              entries={Object.entries(presets)}
              customPresets={customPresets}
            />
          ))}
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
