import { useRef, useState } from "react";
import type { Variation } from "showwhat";
import {
  AlertTriangle,
  Download,
  MoreHorizontal,
  Plus,
  RefreshCw,
  Save,
  Trash2,
  Undo2,
} from "lucide-react";
import { Button } from "../ui/button.js";
import { ConfirmDialog } from "../common/ConfirmDialog.js";
import { Menu, MenuContent, MenuItem, MenuTrigger } from "../ui/menu.js";
import { Input } from "../ui/input.js";
import { Label } from "../ui/label.js";
import { Switch } from "../ui/switch.js";
import { VariationList } from "../variation-editor/VariationList.js";
import type { DefinitionEditorProps } from "../../types.js";

export function DefinitionEditor({
  definitionKey,
  definition,
  validationErrors,
  isDirty,
  isPending,
  onUpdate,
  onRename,
  onSave,
  onDiscard,
  onRemove,
  onExport,
  onRefresh,
}: DefinitionEditorProps) {
  const [editingKey, setEditingKey] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [keyDraft, setKeyDraft] = useState(definitionKey);
  const prevKeyRef = useRef(definitionKey);
  if (prevKeyRef.current !== definitionKey) {
    prevKeyRef.current = definitionKey;
    setKeyDraft(definitionKey);
  }

  async function handleKeySubmit() {
    const trimmed = keyDraft.trim();
    if (trimmed && trimmed !== definitionKey) {
      try {
        await onRename(trimmed);
        setEditingKey(false);
      } catch {
        // Keep rename mode open so the user can retry
      }
    } else {
      setKeyDraft(definitionKey);
      setEditingKey(false);
    }
  }

  function handleAddVariation() {
    onUpdate({
      ...definition,
      variations: [...definition.variations, { id: crypto.randomUUID(), value: "" }],
    });
  }

  const errorCount = validationErrors?.length ?? 0;

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Action bar */}
      <div className="flex h-12 shrink-0 items-center justify-end gap-2 border-b border-border bg-muted/30 px-4">
        <Button
          variant={isDirty ? "default" : "ghost"}
          size="sm"
          disabled={!isDirty || isPending}
          onClick={onSave}
        >
          <Save className="mr-1.5 h-4 w-4" />
          Save
        </Button>
        {onDiscard ? (
          <ConfirmDialog
            title="Discard changes?"
            description="This will revert all unsaved changes to this definition. This action cannot be undone."
            actionLabel="Discard"
            onConfirm={onDiscard}
          >
            <Button variant="ghost" size="sm" disabled={!isDirty || isPending}>
              <Undo2 className="mr-1.5 h-4 w-4" />
              Discard
            </Button>
          </ConfirmDialog>
        ) : (
          <Button variant="ghost" size="sm" disabled>
            <Undo2 className="mr-1.5 h-4 w-4" />
            Discard
          </Button>
        )}
        {onExport && (
          <Menu>
            <MenuTrigger
              render={<Button variant="ghost" size="sm" disabled={isDirty || isPending} />}
            >
              <Download className="mr-1.5 h-4 w-4" />
              Export
            </MenuTrigger>
            <MenuContent>
              <MenuItem onClick={() => onExport("yaml")}>Export as YAML</MenuItem>
              <MenuItem onClick={() => onExport("json")}>Export as JSON</MenuItem>
            </MenuContent>
          </Menu>
        )}
        {(onRemove || onRefresh) && (
          <Menu>
            <MenuTrigger render={<Button variant="ghost" size="sm" aria-label="More actions" />}>
              <MoreHorizontal className="h-4 w-4" />
            </MenuTrigger>
            <MenuContent>
              {onRefresh && (
                <MenuItem disabled={isDirty || isPending} onClick={onRefresh}>
                  <RefreshCw className="mr-1.5 h-4 w-4" />
                  Refresh from server
                </MenuItem>
              )}
              {onRemove && (
                <MenuItem
                  className="text-destructive/60 hover:text-destructive"
                  onClick={() => setDeleteOpen(true)}
                >
                  <Trash2 className="mr-1.5 h-4 w-4" />
                  Delete
                </MenuItem>
              )}
            </MenuContent>
          </Menu>
        )}
        {onRemove && (
          <ConfirmDialog
            title="Delete definition?"
            description={`This will permanently remove "${definitionKey}" and all its variations. This action cannot be undone.`}
            actionLabel="Delete"
            open={deleteOpen}
            onOpenChange={setDeleteOpen}
            onConfirm={onRemove}
          >
            <span />
          </ConfirmDialog>
        )}
      </div>

      {/* Per-definition validation banner */}
      {errorCount > 0 && (
        <div className="shrink-0 border-b border-destructive/30 bg-destructive/10 px-4 py-2">
          <p className="flex items-center gap-1.5 text-xs font-medium text-destructive">
            <AlertTriangle className="h-3.5 w-3.5" />
            {errorCount} validation error{errorCount !== 1 ? "s" : ""} — fix the highlighted fields
            below
          </p>
        </div>
      )}

      <div className="shrink-0 border-b border-border/50 mx-auto w-full max-w-3xl px-8 pt-8 pb-4 space-y-3">
        {/* Title area */}
        <div className="space-y-3">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              {editingKey ? (
                <Input
                  className="h-auto border-none bg-transparent px-0 font-mono text-2xl font-semibold shadow-none focus-visible:ring-0"
                  value={keyDraft}
                  autoFocus
                  onChange={(e) => setKeyDraft(e.target.value)}
                  onBlur={handleKeySubmit}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleKeySubmit();
                    if (e.key === "Escape") {
                      setKeyDraft(definitionKey);
                      setEditingKey(false);
                    }
                  }}
                />
              ) : (
                <button
                  type="button"
                  className="block w-full rounded px-0 py-0 text-left font-mono text-2xl font-semibold hover:text-foreground/70"
                  aria-label="Rename definition key"
                  onClick={() => {
                    setKeyDraft(definitionKey);
                    setEditingKey(true);
                  }}
                >
                  {definitionKey}
                </button>
              )}
            </div>
            <div className="flex shrink-0 items-center gap-2 pt-1.5">
              <Label htmlFor="definition-active" className="text-xs text-muted-foreground">
                Active
              </Label>
              <Switch
                id="definition-active"
                checked={definition.active !== false}
                onCheckedChange={(checked) =>
                  onUpdate({
                    ...definition,
                    active: checked ? undefined : false,
                  })
                }
              />
            </div>
          </div>
          <input
            className="w-full border-none bg-transparent text-sm text-muted-foreground placeholder:text-muted-foreground/50 focus:text-foreground focus:outline-none"
            value={definition.description ?? ""}
            placeholder="Add a description (optional)..."
            aria-label="Definition description"
            onChange={(e) =>
              onUpdate({
                ...definition,
                description: e.target.value || undefined,
              })
            }
          />
        </div>
      </div>

      {/* Scrollable variations area */}
      <div className="min-h-0 flex-1 overflow-auto">
        <div className="mx-auto w-full max-w-3xl px-8 py-8 space-y-4">
          {/* Variations */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Variations
              </span>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs text-muted-foreground"
                onClick={handleAddVariation}
              >
                <Plus className="mr-1 h-3 w-3" />
                Add
              </Button>
            </div>

            <VariationList
              variations={definition.variations}
              validationErrors={validationErrors}
              onChange={(variations: Variation[]) => onUpdate({ ...definition, variations })}
            />

            <button
              type="button"
              className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-border/60 py-2.5 text-xs text-muted-foreground hover:border-border hover:text-foreground"
              onClick={handleAddVariation}
            >
              <Plus className="h-3 w-3" />
              Add variation
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
