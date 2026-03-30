import { Plus } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu.js";
import { BUILTIN_CONDITION_TYPES } from "./condition-registry.js";
import { useConditionExtensions } from "./ConditionExtensionsContext.js";
export { buildDefaultCondition as getDefaultCondition } from "./utils.js";

export function AddConditionMenu({ onAdd }: { onAdd: (type: string) => void }) {
  const extensions = useConditionExtensions();
  const extraTypes = extensions?.extraConditionTypes ?? [];

  const primitives = BUILTIN_CONDITION_TYPES.filter((m) =>
    ["string", "number", "datetime", "bool"].includes(m.type),
  );
  const sugar = BUILTIN_CONDITION_TYPES.filter((m) => ["env", "startAt", "endAt"].includes(m.type));

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded px-3 h-8 text-sm font-medium hover:bg-accent hover:text-accent-foreground dark:hover:bg-accent/50">
        <Plus className="mr-1 h-3.5 w-3.5" />
        Add condition
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        {primitives.map((meta) => (
          <DropdownMenuItem key={meta.type} onSelect={() => onAdd(meta.type)}>
            {meta.label}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        {sugar.map((meta) => (
          <DropdownMenuItem key={meta.type} onSelect={() => onAdd(meta.type)}>
            {meta.label}
          </DropdownMenuItem>
        ))}
        {extraTypes.length > 0 && (
          <>
            <DropdownMenuSeparator />
            {extraTypes.map((meta) => (
              <DropdownMenuItem key={meta.type} onSelect={() => onAdd(meta.type)}>
                {meta.label}
              </DropdownMenuItem>
            ))}
          </>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => onAdd("and")}>AND Group</DropdownMenuItem>
        <DropdownMenuItem onSelect={() => onAdd("or")}>OR Group</DropdownMenuItem>
        <DropdownMenuItem onSelect={() => onAdd("matchAnnotations")}>
          Match Annotations
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => onAdd("__custom")}>Custom</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
