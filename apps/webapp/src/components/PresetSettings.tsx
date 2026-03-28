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
      <h2 className="text-sm font-medium text-muted-foreground">Custom Presets</h2>
      <p className="mt-1 text-xs text-muted-foreground">
        Define named condition presets in YAML or JSON format.
      </p>
      <div className="mt-3 space-y-3">
        <Textarea
          className="min-h-[200px] font-mono text-sm"
          value={draft}
          placeholder={`# Example:\ntier:\n  type: string\n  key: "tier"`}
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

function formatPresetYaml(preset: Presets[string]): string {
  const lines: string[] = [];
  lines.push(`type: ${preset.type}`);
  if (preset.key) {
    lines.push(`key: ${preset.key}`);
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
  const hasDetails = !!preset.key;

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
          <span title="Overrides custom preset">
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

export function InlinePresetList({
  inlinePresets,
  customPresets,
}: {
  inlinePresets: Presets;
  customPresets: Presets;
}) {
  const entries = Object.entries(inlinePresets);

  if (entries.length === 0) {
    return (
      <section>
        <h2 className="text-sm font-medium text-muted-foreground">From Source</h2>
        <p className="mt-3 text-sm text-muted-foreground">No presets from source.</p>
      </section>
    );
  }

  return (
    <section>
      <h2 className="text-sm font-medium text-muted-foreground">From Source</h2>
      <div className="mt-3 space-y-2">
        {entries.map(([name, preset]) => (
          <InlinePresetRow
            key={name}
            name={name}
            preset={preset}
            overridesCustom={name in customPresets}
          />
        ))}
      </div>
    </section>
  );
}
