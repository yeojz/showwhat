import { useState } from "react";
import { Plus, Search, X } from "lucide-react";
import { Button } from "../ui/button.js";
import { Input } from "../ui/input.js";
import { ScrollArea } from "../ui/scroll-area.js";
import { DefinitionListItem } from "./DefinitionListItem.js";
import type { DefinitionListProps } from "../../types.js";

export function DefinitionList({
  definitions,
  selectedKey,
  validationErrors,
  dirtyKeys,
  onSelect,
  onAdd,
  onRemove,
}: DefinitionListProps) {
  const [search, setSearch] = useState("");
  const [adding, setAdding] = useState(false);
  const [newKey, setNewKey] = useState("");

  const keys = Object.keys(definitions).filter((k) =>
    k.toLowerCase().includes(search.toLowerCase()),
  );

  async function handleAdd() {
    const trimmed = newKey.trim();
    if (trimmed && !(trimmed in definitions)) {
      try {
        await onAdd(trimmed);
        setNewKey("");
        setAdding(false);
      } catch {
        // Keep the form open so the user can retry
      }
    }
  }

  return (
    <div className="flex h-full flex-col">
      {/* Search */}
      <div className="p-3">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="h-9 pl-8 text-sm"
            placeholder="Search definitions..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* List */}
      <ScrollArea className="flex-1">
        <div className="px-2">
          {keys.map((key) => (
            <DefinitionListItem
              key={key}
              definitionKey={key}
              variationCount={definitions[key].variations.length}
              isActive={definitions[key].active !== false}
              hasErrors={
                !!(validationErrors?.[key] && (validationErrors[key] as unknown[]).length > 0)
              }
              isDirty={dirtyKeys?.includes(key)}
              isSelected={key === selectedKey}
              onSelect={() => onSelect(key)}
              onRemove={() => onRemove(key)}
            />
          ))}
          {keys.length === 0 && (
            <p className="px-3 py-8 text-center text-sm text-muted-foreground">
              {search ? "No definitions match" : "No definitions"}
            </p>
          )}
        </div>
      </ScrollArea>

      {/* Add definition */}
      <div className="border-t border-border p-3">
        {adding ? (
          <div className="space-y-2">
            <Input
              className="h-9 w-full font-mono text-sm"
              placeholder="definition-key"
              value={newKey}
              autoFocus
              onChange={(e) => setNewKey(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleAdd();
                if (e.key === "Escape") setAdding(false);
              }}
            />
            <div className="flex gap-2">
              <Button size="sm" className="h-8 flex-1" onClick={handleAdd}>
                Save
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-8"
                aria-label="Cancel adding definition"
                onClick={() => {
                  setAdding(false);
                  setNewKey("");
                }}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ) : (
          <Button
            variant="outline"
            size="sm"
            className="h-9 w-full"
            aria-label="Add new definition"
            onClick={() => setAdding(true)}
          >
            <Plus className="mr-1.5 h-4 w-4" />
            New definition
          </Button>
        )}
      </div>
    </div>
  );
}
