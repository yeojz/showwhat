import { useState } from "react";
import {
  Button,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@showwhat/configurator";
import type { HostedSource, SourceFormat } from "../store/source-store.js";

type SourceMode = "bundled" | "split";

type SourceFormDialogProps = {
  open: boolean;
  initial?: HostedSource;
  onSave: (source: Omit<HostedSource, "id">) => void;
  onClose: () => void;
};

function isValidUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    if (parsed.protocol === "https:") return true;
    if (
      parsed.protocol === "http:" &&
      (parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1")
    ) {
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

export function SourceFormDialog({ open, initial, onSave, onClose }: SourceFormDialogProps) {
  const [label, setLabel] = useState(initial?.label ?? "");
  const [mode, setMode] = useState<SourceMode>(initial?.mode ?? "bundled");
  const [format, setFormat] = useState<SourceFormat>(initial?.format ?? "yaml");
  const [url, setUrl] = useState(initial?.mode === "bundled" ? initial.url : "");
  const [baseUrl, setBaseUrl] = useState(initial?.mode === "split" ? initial.baseUrl : "");
  const [listUrl, setListUrl] = useState(initial?.mode === "split" ? (initial.listUrl ?? "") : "");
  const [presetsUrl, setPresetsUrl] = useState(
    initial?.mode === "split" ? (initial.presetsUrl ?? "") : "",
  );
  const [errors, setErrors] = useState<Record<string, string>>({});

  function validate(): boolean {
    const errs: Record<string, string> = {};

    if (!label.trim()) errs.label = "Label is required";

    if (mode === "bundled") {
      if (!url.trim()) errs.url = "URL is required";
      else if (!isValidUrl(url.trim())) errs.url = "Must be HTTPS (or localhost for dev)";
    }

    if (mode === "split") {
      if (!baseUrl.trim()) errs.baseUrl = "Base URL is required";
      else if (!isValidUrl(baseUrl.trim() + "test"))
        errs.baseUrl = "Must be HTTPS (or localhost for dev)";

      if (listUrl.trim() && !isValidUrl(listUrl.trim()))
        errs.listUrl = "Must be HTTPS (or localhost for dev)";

      if (presetsUrl.trim() && !isValidUrl(presetsUrl.trim()))
        errs.presetsUrl = "Must be HTTPS (or localhost for dev)";
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;

    const base = { label: label.trim(), format, headers: initial?.headers };

    if (mode === "bundled") {
      onSave({ ...base, mode: "bundled", url: url.trim() } as Omit<HostedSource, "id">);
    } else {
      onSave({
        ...base,
        mode: "split",
        baseUrl: baseUrl.trim(),
        listUrl: listUrl.trim() || undefined,
        presetsUrl: presetsUrl.trim() || undefined,
        definitionKeys: initial?.mode === "split" ? initial.definitionKeys : [],
      } as Omit<HostedSource, "id">);
    }
  }

  function onOpenChange(v: boolean) {
    if (!v) onClose();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{initial ? "Edit hosted source" : "Add hosted source"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-1.5">
            <Label htmlFor="source-label">Label</Label>
            <Input
              id="source-label"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder='e.g. "Production"'
            />
            {errors.label && <p className="text-xs text-destructive">{errors.label}</p>}
          </div>

          <div className="space-y-1.5">
            <Label>Mode</Label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  name="mode"
                  checked={mode === "bundled"}
                  onChange={() => setMode("bundled")}
                  className="accent-primary"
                />
                Bundled file
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  name="mode"
                  checked={mode === "split"}
                  onChange={() => setMode("split")}
                  className="accent-primary"
                />
                Split (per-definition)
              </label>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="source-format">Format</Label>
            <Select value={format} onValueChange={(v) => setFormat(v as SourceFormat)}>
              <SelectTrigger id="source-format" className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="yaml">YAML</SelectItem>
                <SelectItem value="json">JSON</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {mode === "bundled" && (
            <div className="space-y-1.5">
              <Label htmlFor="source-url">URL</Label>
              <Input
                id="source-url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://r2.example.com/flags"
              />
              {errors.url && <p className="text-xs text-destructive">{errors.url}</p>}
            </div>
          )}

          {mode === "split" && (
            <>
              <div className="space-y-1.5">
                <Label htmlFor="source-base-url">Base URL</Label>
                <Input
                  id="source-base-url"
                  value={baseUrl}
                  onChange={(e) => setBaseUrl(e.target.value)}
                  placeholder="https://r2.example.com/defs/"
                />
                <p className="text-xs text-muted-foreground">
                  Definition keys are appended to this URL prefix.
                </p>
                {errors.baseUrl && <p className="text-xs text-destructive">{errors.baseUrl}</p>}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="source-list-url">List URL (optional)</Label>
                <Input
                  id="source-list-url"
                  value={listUrl}
                  onChange={(e) => setListUrl(e.target.value)}
                  placeholder="https://r2.example.com/keys"
                />
                <p className="text-xs text-muted-foreground">
                  Endpoint that returns available definition keys. You can also add keys manually.
                </p>
                {errors.listUrl && <p className="text-xs text-destructive">{errors.listUrl}</p>}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="source-presets-url">Presets URL (optional)</Label>
                <Input
                  id="source-presets-url"
                  value={presetsUrl}
                  onChange={(e) => setPresetsUrl(e.target.value)}
                  placeholder="https://r2.example.com/presets"
                />
                <p className="text-xs text-muted-foreground">
                  Shared presets for all definitions. Must return a presets object.
                </p>
                {errors.presetsUrl && (
                  <p className="text-xs text-destructive">{errors.presetsUrl}</p>
                )}
              </div>
            </>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" size="sm" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" size="sm">
              {initial ? "Update" : "Add source"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
