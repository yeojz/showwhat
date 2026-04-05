import { Plus } from "lucide-react";
import { Menu, MenuContent, MenuItem, MenuSeparator, MenuTrigger } from "../ui/menu.js";
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
    <Menu>
      <MenuTrigger className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded px-3 h-8 text-sm font-medium hover:bg-accent hover:text-accent-foreground dark:hover:bg-accent/50">
        <Plus className="mr-1 h-3.5 w-3.5" />
        Add condition
      </MenuTrigger>
      <MenuContent align="start">
        {primitives.map((meta) => (
          <MenuItem key={meta.type} onClick={() => onAdd(meta.type)}>
            {meta.label}
          </MenuItem>
        ))}
        <MenuSeparator />
        {sugar.map((meta) => (
          <MenuItem key={meta.type} onClick={() => onAdd(meta.type)}>
            {meta.label}
          </MenuItem>
        ))}
        {extraTypes.length > 0 && (
          <>
            <MenuSeparator />
            {extraTypes.map((meta) => (
              <MenuItem key={meta.type} onClick={() => onAdd(meta.type)}>
                {meta.label}
              </MenuItem>
            ))}
          </>
        )}
        <MenuSeparator />
        <MenuItem onClick={() => onAdd("and")}>and</MenuItem>
        <MenuItem onClick={() => onAdd("or")}>or</MenuItem>
        <MenuItem onClick={() => onAdd("matchAnnotations")}>
          matchAnnotations
        </MenuItem>
        <MenuSeparator />
        <MenuItem onClick={() => onAdd("__custom")}>Custom</MenuItem>
      </MenuContent>
    </Menu>
  );
}
