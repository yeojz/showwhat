import { useCallback, useMemo } from "react";
import type { Condition } from "showwhat";
import { AUTO_ID_PREFIX, ensureIds } from "../../utils/id.js";
import { getDefaultCondition } from "./AddConditionMenu.js";
import { useConditionExtensions } from "./ConditionExtensionsContext.js";

export type ConditionArrayHandlers = {
  /** Conditions with IDs guaranteed to be present. */
  conditions: Condition[];
  handleConditionChange: (index: number, updated: Condition) => void;
  handleConditionRemove: (index: number) => void;
  handleMoveUp: (index: number) => void;
  handleMoveDown: (index: number) => void;
  handleAddCondition: (type: string) => void;
};

/**
 * Shared hook that manages an array of conditions.
 * Extracts the common handler logic duplicated across
 * ConditionBuilder and ConditionGroup.
 *
 * Backfills `id` on conditions that arrive without one and
 * assigns `id: crypto.randomUUID()` to newly added conditions.
 */
export function useConditionArray(
  conditions: Condition[],
  onChange: (conditions: Condition[]) => void,
): ConditionArrayHandlers {
  const extensions = useConditionExtensions();
  const extraTypes = extensions?.extraConditionTypes;

  // Backfill IDs on incoming conditions
  const withIds = useMemo(() => ensureIds(conditions), [conditions]);

  const handleConditionChange = useCallback(
    (index: number, updated: Condition) => {
      const next = [...withIds];
      next[index] = updated;
      onChange(next);
    },
    [withIds, onChange],
  );

  const handleConditionRemove = useCallback(
    (index: number) => {
      onChange(withIds.filter((_, i) => i !== index));
    },
    [withIds, onChange],
  );

  const handleAddCondition = useCallback(
    (type: string) => {
      const newCondition = getDefaultCondition(
        type,
        `${AUTO_ID_PREFIX}${crypto.randomUUID()}`,
        extraTypes,
      );
      onChange([...withIds, newCondition]);
    },
    [withIds, onChange, extraTypes],
  );

  const handleMoveUp = useCallback(
    (index: number) => {
      if (index <= 0) return;
      const next = [...withIds];
      [next[index - 1], next[index]] = [next[index], next[index - 1]];
      onChange(next);
    },
    [withIds, onChange],
  );

  const handleMoveDown = useCallback(
    (index: number) => {
      if (index >= withIds.length - 1) return;
      const next = [...withIds];
      [next[index], next[index + 1]] = [next[index + 1], next[index]];
      onChange(next);
    },
    [withIds, onChange],
  );

  return {
    conditions: withIds,
    handleConditionChange,
    handleConditionRemove,
    handleMoveUp,
    handleMoveDown,
    handleAddCondition,
  };
}
