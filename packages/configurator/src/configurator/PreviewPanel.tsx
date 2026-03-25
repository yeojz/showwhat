import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Badge } from "@/components/ui/badge.js";
import { Button } from "@/components/ui/button.js";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog.js";
import { Label } from "@/components/ui/label.js";
import { ScrollArea } from "@/components/ui/scroll-area.js";
import { Separator } from "@/components/ui/separator.js";
import { Textarea } from "@/components/ui/textarea.js";
import { ChevronRight, Eye, Loader2, Maximize2, Play } from "lucide-react";
import { resolve } from "@showwhat/core";
import type { ConditionEvaluator } from "@showwhat/core";
import {
  DefinitionInactiveError,
  DefinitionNotFoundError,
  VariationNotFoundError,
} from "@showwhat/core";
import type { Context } from "@showwhat/core/schemas";
import { useConfiguratorSelector } from "./useConfiguratorSelector.js";
import type { PreviewResult } from "./preview-store.js";
import { selectDefinitions, selectSelectedKey } from "./selectors.js";
import { useFallbackEvaluator } from "./fallback-context.js";

function ResultBadge({ result, onViewMeta }: { result: PreviewResult; onViewMeta?: () => void }) {
  switch (result.status) {
    case "success":
      return (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Badge className="bg-status-active/15 text-green-700 hover:bg-status-active/15 dark:text-green-400">
              Matched
            </Badge>
            {onViewMeta ? (
              <button
                type="button"
                className="flex items-center gap-1 text-xs text-muted-foreground/60 hover:text-muted-foreground hover:cursor-pointer"
                onClick={onViewMeta}
                aria-label="View evaluation meta"
              >
                <Eye className="size-3" />
                <span>Details</span>
                <span>|</span>
                <span>Variation #{result.meta.variation.index}</span>
              </button>
            ) : (
              <span className="text-xs text-muted-foreground">
                Variation #{result.meta.variation.index}
              </span>
            )}
          </div>
          <div className="rounded-md border border-border bg-background p-2">
            <pre className="whitespace-pre-wrap break-all font-mono text-xs">
              {typeof result.value === "string"
                ? result.value
                : JSON.stringify(result.value, null, 2)}
            </pre>
          </div>
        </div>
      );
    case "inactive":
      return (
        <div className="space-y-2">
          <Badge className="bg-amber-500/15 text-amber-600 hover:bg-amber-500/15">Inactive</Badge>
          <p className="text-xs text-muted-foreground">{result.message}</p>
        </div>
      );
    case "no-match":
      return (
        <div className="space-y-2">
          <Badge className="bg-orange-500/15 text-orange-600 hover:bg-orange-500/15">
            No Match
          </Badge>
          <p className="text-xs text-muted-foreground">{result.message}</p>
        </div>
      );
    case "error":
      return (
        <div className="space-y-2">
          <Badge variant="destructive">Error</Badge>
          <p className="text-xs text-destructive">{result.message}</p>
        </div>
      );
  }
}

function parseContextJson(text: string): Context {
  const trimmed = text.trim();
  if (!trimmed) return {};
  const parsed = JSON.parse(trimmed);
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    throw new SyntaxError("Context must be a JSON object");
  }
  const context: Context = {};
  for (const [key, value] of Object.entries(parsed)) {
    if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
      context[key] = value;
    }
  }
  return context;
}

function parseEvaluatorOverrides(text: string): Record<string, boolean> {
  const overrides: Record<string, boolean> = {};
  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    const idx = trimmed.indexOf(":");
    if (idx < 1) continue;
    const type = trimmed.slice(0, idx).trim();
    const value = trimmed
      .slice(idx + 1)
      .trim()
      .toLowerCase();
    if (type && (value === "true" || value === "false")) {
      overrides[type] = value === "true";
    }
  }
  return overrides;
}

function JsonEditorDialog({
  open,
  onOpenChange,
  value,
  onSave,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  value: string;
  onSave: (value: string) => void;
}) {
  const [draft, setDraft] = useState(value);
  const [formatError, setFormatError] = useState<string | null>(null);

  // Sync draft when dialog opens
  useEffect(() => {
    if (open) {
      setDraft(value);
      setFormatError(null);
    }
  }, [open, value]);

  function handleFormat() {
    const trimmed = draft.trim();
    if (!trimmed) return;
    try {
      const parsed = JSON.parse(trimmed);
      setDraft(JSON.stringify(parsed, null, 2));
      setFormatError(null);
    } catch {
      setFormatError("Invalid JSON");
    }
  }

  function handleSave() {
    onSave(draft);
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Edit Context</DialogTitle>
          <DialogDescription>
            JSON object with context values for resolving the definition.
          </DialogDescription>
        </DialogHeader>
        <Textarea
          placeholder={'{\n  "env": "production",\n  "region": "us-east-1"\n}'}
          value={draft}
          onChange={(e) => {
            setDraft(e.target.value);
            setFormatError(null);
          }}
          className={`min-h-64 font-mono text-sm ${formatError ? "border-destructive" : ""}`}
          rows={14}
        />
        {formatError && <p className="text-xs text-destructive">{formatError}</p>}
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={handleFormat}>
            Format
          </Button>
          <Button size="sm" onClick={handleSave}>
            Apply
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function PreviewPanel() {
  const definitions = useConfiguratorSelector(selectDefinitions);
  const selectedKey = useConfiguratorSelector(selectSelectedKey);
  const externalFallback = useFallbackEvaluator();

  const [contextText, setContextText] = useState("");
  const [evaluatorText, setEvaluatorText] = useState("");
  const [contextError, setContextError] = useState<string | null>(null);
  const [simulatorOpen, setSimulatorOpen] = useState(false);
  const [jsonEditorOpen, setJsonEditorOpen] = useState(false);
  const [previewResult, setPreviewResult] = useState<PreviewResult | null>(null);
  const [isResolving, setIsResolving] = useState(false);
  const [metaDialogOpen, setMetaDialogOpen] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Clear result and abort in-flight requests when selection changes
  useEffect(() => {
    abortControllerRef.current?.abort();
    abortControllerRef.current = null;
    setPreviewResult(null);

    return () => {
      abortControllerRef.current?.abort();
    };
  }, [selectedKey]);

  const fallback: ConditionEvaluator | undefined = useMemo(() => {
    const overrides = parseEvaluatorOverrides(evaluatorText);
    const hasOverrides = Object.keys(overrides).length > 0;

    if (!hasOverrides && !externalFallback) return undefined;

    return async (args) => {
      const type = (args.condition as { type: string }).type;
      if (type in overrides) return overrides[type];
      if (externalFallback) return externalFallback(args);
      return false;
    };
  }, [evaluatorText, externalFallback]);

  const handleResolve = useCallback(async () => {
    if (!selectedKey || !definitions[selectedKey]) {
      setPreviewResult({ status: "error", message: "No definition selected" });
      return;
    }

    abortControllerRef.current?.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setIsResolving(true);
    setContextError(null);

    let context: Context;
    try {
      context = parseContextJson(contextText);
    } catch {
      setPreviewResult({ status: "error", message: "Invalid JSON in context" });
      setIsResolving(false);
      return;
    }

    try {
      const result = await resolve({
        definitions: { [selectedKey]: definitions[selectedKey] },
        context,
        options: fallback ? { fallback } : undefined,
      });

      if (controller.signal.aborted) return;

      const resolution = result[selectedKey];
      setPreviewResult({
        status: "success",
        value: resolution.value,
        meta: resolution.meta,
      });
    } catch (err) {
      if (controller.signal.aborted) return;

      if (err instanceof DefinitionInactiveError) {
        setPreviewResult({
          status: "inactive",
          message: `"${selectedKey}" is inactive`,
        });
      } else if (err instanceof VariationNotFoundError) {
        setPreviewResult({
          status: "no-match",
          message: "No variation matched the given context",
        });
      } else if (err instanceof DefinitionNotFoundError) {
        setPreviewResult({
          status: "error",
          message: `Definition "${selectedKey}" not found`,
        });
      } else {
        setPreviewResult({
          status: "error",
          message: err instanceof Error ? err.message : "Unknown error",
        });
      }
    } finally {
      if (!controller.signal.aborted) {
        setIsResolving(false);
      }
    }
  }, [selectedKey, definitions, contextText, fallback]);

  return (
    <div className="flex w-80 shrink-0 flex-col border-l border-border bg-muted/30">
      {/* Header */}
      <div className="flex h-12 items-center border-b border-border px-3">
        <span className="text-sm font-semibold">Preview</span>
      </div>

      <ScrollArea className="flex-1">
        <div className="space-y-4 p-3">
          {/* Selected definition */}
          <div>
            <Label className="text-xs text-muted-foreground">Definition</Label>
            <p className="mt-0.5 truncate font-mono text-sm">{selectedKey ?? "None selected"}</p>
          </div>

          <Separator />

          {/* Context (JSON) — read-only preview, click to edit */}
          <div>
            <div className="flex items-center justify-between">
              <Label className="text-xs text-muted-foreground">Context</Label>
              <button
                type="button"
                className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground"
                onClick={() => setJsonEditorOpen(true)}
              >
                <Maximize2 className="h-3 w-3" />
                Edit
              </button>
            </div>
            <button
              type="button"
              className={`mt-1.5 w-full cursor-pointer rounded-md border bg-transparent px-3 py-2 text-left transition-colors hover:border-ring ${contextError ? "border-destructive" : "border-input"}`}
              onClick={() => setJsonEditorOpen(true)}
            >
              {contextText.trim() ? (
                <pre className="max-h-28 overflow-hidden font-mono text-xs text-foreground">
                  {contextText}
                </pre>
              ) : (
                <span className="font-mono text-xs text-muted-foreground">
                  {'{ "env": "production" }'}
                </span>
              )}
            </button>
            {contextError && <p className="mt-1 text-[10px] text-destructive">{contextError}</p>}
            <JsonEditorDialog
              open={jsonEditorOpen}
              onOpenChange={setJsonEditorOpen}
              value={contextText}
              onSave={(v) => {
                setContextText(v);
                setContextError(null);
              }}
            />
          </div>

          <Separator />

          {/* Condition simulator (collapsible) */}
          <div>
            <button
              type="button"
              className="flex w-full items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
              onClick={() => setSimulatorOpen((o) => !o)}
            >
              <ChevronRight
                className={`h-3.5 w-3.5 transition-transform ${simulatorOpen ? "rotate-90" : ""}`}
              />
              Condition Simulator
            </button>
            {simulatorOpen && (
              <div className="mt-2">
                <Textarea
                  placeholder={"tier:true\ngeo:false"}
                  value={evaluatorText}
                  onChange={(e) => setEvaluatorText(e.target.value)}
                  className="min-h-20 font-mono text-xs"
                  rows={6}
                />
                <p className="mt-1 text-[10px] text-muted-foreground">
                  Simulate unregistered condition types. One type:true|false per line
                </p>
              </div>
            )}
          </div>

          {/* Resolve button */}
          <Button
            size="sm"
            className="w-full"
            onClick={handleResolve}
            disabled={!selectedKey || isResolving}
          >
            {isResolving ? (
              <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
            ) : (
              <Play className="mr-1.5 h-4 w-4" />
            )}
            Resolve
          </Button>

          {/* Result */}
          {previewResult && (
            <>
              <Separator />
              <div className="animate-slide-in-right">
                <Label className="text-xs text-muted-foreground">Result</Label>
                <div className="mt-1.5">
                  <ResultBadge
                    result={previewResult}
                    onViewMeta={
                      previewResult.status === "success" ? () => setMetaDialogOpen(true) : undefined
                    }
                  />
                </div>
                {previewResult.status === "success" && (
                  <Dialog open={metaDialogOpen} onOpenChange={setMetaDialogOpen}>
                    <DialogContent className="sm:max-w-lg">
                      <DialogHeader>
                        <DialogTitle>Evaluation Meta</DialogTitle>
                        <DialogDescription>
                          Full resolution metadata from the last evaluation.
                        </DialogDescription>
                      </DialogHeader>
                      <ScrollArea className="max-h-96">
                        <pre className="whitespace-pre-wrap break-all font-mono text-xs">
                          {JSON.stringify(previewResult.meta, null, 2)}
                        </pre>
                      </ScrollArea>
                    </DialogContent>
                  </Dialog>
                )}
              </div>
            </>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
