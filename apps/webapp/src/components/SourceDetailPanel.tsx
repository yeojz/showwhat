import { useState } from "react";
import { Badge, Button, ConfirmDialog, Input, Label } from "@showwhat/configurator";
import { cn } from "@showwhat/configurator";
import {
  ChevronRight,
  Globe,
  Info,
  Loader2,
  Pencil,
  Plug,
  Plus,
  RefreshCw,
  Trash2,
  Unplug,
  X,
} from "lucide-react";
import type { HostedSource, SplitSource } from "../store/source-store.js";

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

const modeBadgeStyles: Record<string, string> = {
  bundled: "border-border bg-muted/60 text-foreground/50",
  split: "border-border bg-muted/60 text-foreground/50",
};

const formatBadgeStyles: Record<string, string> = {
  yaml: "border-border bg-muted/60 text-muted-foreground",
  json: "border-border bg-muted/60 text-muted-foreground",
};

function ModeBadge({ mode }: { mode: string }) {
  return (
    <Badge variant="outline" className={cn("text-[10px] shrink-0", modeBadgeStyles[mode])}>
      {mode}
    </Badge>
  );
}

function FormatBadge({ format }: { format: string }) {
  return (
    <Badge variant="outline" className={cn("text-[10px] shrink-0", formatBadgeStyles[format])}>
      {format}
    </Badge>
  );
}

function UrlRow({
  label,
  url,
  lastFetched,
  loading,
  onReload,
}: {
  label: string;
  url: string;
  lastFetched?: number;
  loading: boolean;
  onReload?: () => void;
}) {
  return (
    <div className="flex items-start gap-3 px-3 py-2.5">
      <span className="text-[11px] font-medium text-muted-foreground/70 w-20 shrink-0 pt-0.5 uppercase tracking-wide">
        {label}
      </span>
      <div className="flex-1 min-w-0">
        <span className="font-mono text-xs break-all text-foreground leading-relaxed">{url}</span>
        {lastFetched && (
          <span className="ml-2 text-[10px] text-muted-foreground/60">
            {formatRelativeTime(lastFetched)}
          </span>
        )}
      </div>
      {onReload && (
        <Button
          variant="ghost"
          size="sm"
          className="h-6 w-6 p-0 text-muted-foreground shrink-0"
          disabled={loading}
          onClick={onReload}
          title={`Reload from ${label.toLowerCase()}`}
        >
          {loading ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <RefreshCw className="h-3 w-3" />
          )}
        </Button>
      )}
    </div>
  );
}

type HeaderEntry = { key: string; value: string };

function HeadersSection({
  headers,
  onUpdateHeaders,
}: {
  headers?: Record<string, string>;
  onUpdateHeaders: (headers: Record<string, string> | undefined) => void;
}) {
  const entries: HeaderEntry[] = headers
    ? Object.entries(headers).map(([key, value]) => ({ key, value }))
    : [];

  const [open, setOpen] = useState(entries.length > 0);
  const [newKey, setNewKey] = useState("");
  const [newValue, setNewValue] = useState("");

  function handleAdd() {
    const trimmedKey = newKey.trim();
    const trimmedValue = newValue.trim();
    if (!trimmedKey || !trimmedValue) return;
    const updated = { ...headers, [trimmedKey]: trimmedValue };
    onUpdateHeaders(updated);
    setNewKey("");
    setNewValue("");
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAdd();
    }
  }

  function handleRemove(key: string) {
    if (!headers) return;
    const updated = { ...headers };
    delete updated[key];
    onUpdateHeaders(Object.keys(updated).length > 0 ? updated : undefined);
  }

  return (
    <section className="rounded-md border border-border overflow-hidden">
      <button
        type="button"
        className="flex w-full items-center gap-2 px-3 py-2.5 text-left hover:bg-muted/30 transition-colors"
        onClick={() => setOpen(!open)}
      >
        <ChevronRight
          className={cn(
            "h-3 w-3 text-muted-foreground/60 transition-transform",
            open && "rotate-90",
          )}
        />
        <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground cursor-pointer">
          Headers
        </Label>
        {entries.length > 0 && (
          <Badge
            variant="outline"
            className="text-[10px] border-border bg-muted/60 text-muted-foreground"
          >
            {entries.length}
          </Badge>
        )}
      </button>

      {open && (
        <div className="border-t border-border px-3 pb-3 pt-2.5 space-y-3">
          {entries.length > 0 && (
            <div className="space-y-1">
              {entries.map(({ key, value }) => (
                <div
                  key={key}
                  className="flex items-center justify-between rounded-md bg-muted/40 px-3 py-1.5 text-sm"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="font-mono text-xs font-medium">{key}</span>
                    <span className="text-xs text-muted-foreground">{value}</span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                    onClick={() => handleRemove(key)}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
          )}

          <div className="flex gap-2">
            <Input
              value={newKey}
              onChange={(e) => setNewKey(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Header name"
              className="h-8 flex-1 text-sm"
            />
            <Input
              value={newValue}
              onChange={(e) => setNewValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Value"
              className="h-8 flex-1 text-sm"
            />
            <Button variant="outline" size="sm" className="h-8" onClick={handleAdd}>
              <Plus className="mr-1 h-3 w-3" />
              Add
            </Button>
          </div>

          <div className="flex items-start gap-1.5 rounded-md bg-muted/30 p-2 text-[11px] text-muted-foreground/70">
            <Info className="mt-0.5 h-3 w-3 shrink-0" />
            <span>
              Headers are stored in your browser&apos;s local storage. Avoid storing long-lived
              secrets here.
            </span>
          </div>
        </div>
      )}
    </section>
  );
}

function KeyListSection({
  source,
  dirtyKeys,
  loading,
  isLoaded,
  onReloadKey,
  onAddKey,
  onRemoveKey,
}: {
  source: SplitSource;
  dirtyKeys: string[];
  loading: boolean;
  isLoaded: boolean;
  onReloadKey: (key: string) => void;
  onAddKey: (key: string) => void;
  onRemoveKey: (key: string) => void;
}) {
  const [newKey, setNewKey] = useState("");

  function handleAddKey() {
    const trimmed = newKey.trim();
    if (!trimmed) return;
    onAddKey(trimmed);
    setNewKey("");
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAddKey();
    }
  }

  return (
    <section className="space-y-2.5">
      <div className="flex items-center gap-2">
        <h3 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Definition Keys
        </h3>
        {source.definitionKeys.length > 0 && (
          <Badge
            variant="outline"
            className="text-[10px] border-border bg-muted/60 text-muted-foreground"
          >
            {source.definitionKeys.length}
          </Badge>
        )}
      </div>

      {source.definitionKeys.length > 0 ? (
        <div className="rounded-md border border-border divide-y divide-border overflow-hidden">
          {source.definitionKeys.map((key) => {
            const isDirty = dirtyKeys.includes(key);
            const fetchedAt = source.keyFetchedAt?.[key];
            return (
              <div key={key} className="flex items-center justify-between px-3 py-2 text-sm">
                <div className="min-w-0">
                  <span className="font-mono text-xs text-foreground">{key}</span>
                  {fetchedAt && (
                    <span className="ml-2 text-[10px] text-muted-foreground/60">
                      {formatRelativeTime(fetchedAt)}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {isLoaded && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0 text-muted-foreground"
                      disabled={loading || isDirty}
                      onClick={() => onReloadKey(key)}
                      title={isDirty ? "Save or discard changes first" : `Reload ${key}`}
                    >
                      <RefreshCw className={cn("h-3 w-3", isDirty && "opacity-30")} />
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                    onClick={() => onRemoveKey(key)}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">
          No keys configured.{" "}
          {source.listUrl ? "Reload from list endpoint or add manually." : "Add keys manually."}
        </p>
      )}

      <div className="flex gap-2">
        <Input
          value={newKey}
          onChange={(e) => setNewKey(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Add definition key..."
          className="h-8 flex-1 text-sm"
        />
        <Button variant="outline" size="sm" className="h-8" onClick={handleAddKey}>
          <Plus className="mr-1 h-3 w-3" />
          Add
        </Button>
      </div>
    </section>
  );
}

export { ModeBadge, FormatBadge };

export function SourceDetailPanel({
  source,
  isLoaded,
  dirtyKeys,
  loading,
  onLoad,
  onRefreshSingle,
  onUnload,
  onEdit,
  onDelete,
  onReloadKeyList,
  onReloadKey,
  onReloadPresets,
  onAddKey,
  onRemoveKey,
  onUpdateHeaders,
}: {
  source: HostedSource;
  isLoaded: boolean;
  dirtyKeys: string[];
  loading: boolean;
  onLoad: () => void;
  onRefreshSingle: () => void;
  onUnload: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onReloadKeyList: () => void;
  onReloadKey: (key: string) => void;
  onReloadPresets: () => void;
  onAddKey: (key: string) => void;
  onRemoveKey: (key: string) => void;
  onUpdateHeaders: (headers: Record<string, string> | undefined) => void;
}) {
  return (
    <div className="flex h-full flex-col">
      {/* Top bar */}
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <div className="flex items-center gap-2 min-w-0">
          <Globe className="h-4 w-4 shrink-0 text-muted-foreground" />
          <span className="text-sm font-semibold truncate">{source.label}</span>
          <ModeBadge mode={source.mode} />
          <FormatBadge format={source.format} />
          {isLoaded && (
            <Badge
              variant="outline"
              className="text-[10px] shrink-0 border-primary/40 text-primary"
            >
              loaded
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {!isLoaded && (
            <ConfirmDialog
              title="Load source?"
              description="This will replace current definitions and unsaved changes."
              actionLabel="Load"
              onConfirm={onLoad}
            >
              <Button variant="default" size="sm" className="h-7" disabled={loading}>
                {loading ? (
                  <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Plug className="mr-1 h-3.5 w-3.5" />
                )}
                Load
              </Button>
            </ConfirmDialog>
          )}

          {isLoaded && (
            <ConfirmDialog
              title="Unload source?"
              description="This will remove all definitions and unsaved changes. This action cannot be undone."
              actionLabel="Unload"
              onConfirm={onUnload}
            >
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-destructive/70 hover:text-destructive hover:bg-destructive/10"
              >
                <Unplug className="mr-1 h-3.5 w-3.5" />
                Unload
              </Button>
            </ConfirmDialog>
          )}

          <Button variant="ghost" size="sm" className="h-7" onClick={onEdit}>
            <Pencil className="mr-1 h-3.5 w-3.5" />
            Edit
          </Button>

          <ConfirmDialog
            title="Delete source?"
            description={`Remove "${source.label}" from your saved sources? This cannot be undone.`}
            actionLabel="Delete"
            onConfirm={onDelete}
          >
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-muted-foreground hover:text-destructive"
            >
              <Trash2 className="mr-1 h-3.5 w-3.5" />
              Delete
            </Button>
          </ConfirmDialog>
        </div>
      </div>

      {/* Content — constrained width */}
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-2xl p-6 space-y-8">
          {/* Endpoints — primary content, prominent card */}
          <section className="space-y-2">
            <h3 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Endpoints
            </h3>
            <div className="rounded-md border border-border divide-y divide-border overflow-hidden bg-card">
              {source.mode === "bundled" && (
                <UrlRow
                  label="URL"
                  url={source.url}
                  lastFetched={source.lastFetched}
                  loading={loading}
                  onReload={isLoaded ? onRefreshSingle : undefined}
                />
              )}
              {source.mode === "split" && (
                <>
                  <UrlRow label="Base URL" url={source.baseUrl} loading={loading} />
                  {source.listUrl && (
                    <UrlRow
                      label="List URL"
                      url={source.listUrl}
                      lastFetched={source.listLastFetched}
                      loading={loading}
                      onReload={isLoaded ? onReloadKeyList : undefined}
                    />
                  )}
                  {source.presetsUrl && (
                    <UrlRow
                      label="Presets URL"
                      url={source.presetsUrl}
                      lastFetched={source.presetsLastFetched}
                      loading={loading}
                      onReload={isLoaded ? onReloadPresets : undefined}
                    />
                  )}
                </>
              )}
            </div>
          </section>

          {/* Headers — secondary, collapsible, grouped with endpoints */}
          <HeadersSection headers={source.headers} onUpdateHeaders={onUpdateHeaders} />

          {/* Key list management (split sources only) */}
          {source.mode === "split" && (
            <KeyListSection
              source={source}
              dirtyKeys={dirtyKeys}
              loading={loading}
              isLoaded={isLoaded}
              onReloadKey={onReloadKey}
              onAddKey={onAddKey}
              onRemoveKey={onRemoveKey}
            />
          )}
        </div>
      </div>
    </div>
  );
}
