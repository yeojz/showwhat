import { useState, useCallback, useRef, useMemo } from "react";
import { Plus, Search } from "lucide-react";
import { Menu, MenuContent, MenuItem, MenuSeparator, MenuTrigger } from "../ui/menu.js";
import { BUILTIN_CONDITION_TYPES } from "./condition-registry.js";
import { useConditionExtensions } from "./ConditionExtensionsContext.js";
export { buildDefaultCondition as getDefaultCondition } from "./utils.js";

interface ConditionItem {
  type: string;
  label: string;
  group: string;
}

const BUILTIN_TYPES = new Set(["string", "number", "datetime", "bool", "env", "startAt", "endAt"]);

const GROUP_ITEMS: ConditionItem[] = [
  { type: "and", label: "and", group: "Groups" },
  { type: "or", label: "or", group: "Groups" },
  { type: "checkAnnotations", label: "checkAnnotations", group: "Groups" },
];

const CUSTOM_ITEM: ConditionItem = { type: "__custom", label: "Custom", group: "" };

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <span className="px-2 py-1 text-[10px] uppercase tracking-wider text-muted-foreground/70">
      {children}
    </span>
  );
}

export function AddConditionMenu({ onAdd }: { onAdd: (type: string) => void }) {
  const extensions = useConditionExtensions();
  const extraTypes = extensions?.extraConditionTypes ?? [];
  const [filter, setFilter] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const allItems = useMemo(() => {
    const items: ConditionItem[] = [];
    for (const m of BUILTIN_CONDITION_TYPES) {
      if (BUILTIN_TYPES.has(m.type)) {
        items.push({ type: m.type, label: m.label, group: "Built-in" });
      }
    }
    for (const m of extraTypes) {
      items.push({ type: m.type, label: m.label, group: "Presets" });
    }
    items.push(...GROUP_ITEMS);
    items.push(CUSTOM_ITEM);
    return items;
  }, [extraTypes]);

  const filtered = useMemo(() => {
    if (!filter.trim()) return null;
    const q = filter.toLowerCase();
    return allItems.filter(
      (item) => item.label.toLowerCase().includes(q) || item.type.toLowerCase().includes(q),
    );
  }, [filter, allItems]);

  const handleSelect = useCallback(
    (type: string) => {
      setFilter("");
      onAdd(type);
    },
    [onAdd],
  );

  const builtins = BUILTIN_CONDITION_TYPES.filter((m) => BUILTIN_TYPES.has(m.type));

  return (
    <Menu
      onOpenChange={(open) => {
        if (!open) setFilter("");
      }}
    >
      <MenuTrigger className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded px-3 h-8 text-sm font-medium hover:bg-accent hover:text-accent-foreground dark:hover:bg-accent/50">
        <Plus className="mr-1 h-3.5 w-3.5" />
        Add condition
      </MenuTrigger>
      <MenuContent align="start" className="max-h-[70vh] overflow-y-auto">
        <div className="sticky top-0 z-10 bg-popover px-1 pb-1">
          <div className="flex items-center gap-1.5 rounded-sm border border-input px-2 py-1">
            <Search className="h-3.5 w-3.5 shrink-0 text-muted-foreground/50" />
            <input
              ref={inputRef}
              type="text"
              className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground/50"
              placeholder="Filter..."
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              onKeyDown={(e) => e.stopPropagation()}
            />
          </div>
        </div>

        {filtered ? (
          filtered.length > 0 ? (
            filtered.map((item) => (
              <MenuItem key={item.type} onClick={() => handleSelect(item.type)}>
                {item.label}
              </MenuItem>
            ))
          ) : (
            <span className="block px-2 py-1.5 text-sm text-muted-foreground">No matches</span>
          )
        ) : (
          <>
            <SectionLabel>Built-in</SectionLabel>
            {builtins.map((meta) => (
              <MenuItem key={meta.type} onClick={() => handleSelect(meta.type)}>
                {meta.label}
              </MenuItem>
            ))}
            {extraTypes.length > 0 && (
              <>
                <MenuSeparator />
                <SectionLabel>Presets</SectionLabel>
                {extraTypes.map((meta) => (
                  <MenuItem key={meta.type} onClick={() => handleSelect(meta.type)}>
                    {meta.label}
                  </MenuItem>
                ))}
              </>
            )}
            <MenuSeparator />
            <SectionLabel>Groups</SectionLabel>
            <MenuItem onClick={() => handleSelect("and")}>and</MenuItem>
            <MenuItem onClick={() => handleSelect("or")}>or</MenuItem>
            <MenuItem onClick={() => handleSelect("checkAnnotations")}>checkAnnotations</MenuItem>
            <MenuSeparator />
            <MenuItem onClick={() => handleSelect("__custom")}>Custom</MenuItem>
          </>
        )}
      </MenuContent>
    </Menu>
  );
}
