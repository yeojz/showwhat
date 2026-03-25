import { useCallback, useMemo } from "react";
import type { Variation } from "@showwhat/core/schemas";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { VariationCard } from "./VariationCard.js";
import type { VariationListProps, ValidationIssueDisplay } from "../../types.js";
import { filterErrorsByPath } from "../../utils/validation-errors.js";
import { ensureIds } from "../../utils/id.js";

function SortableVariation({
  id,
  variation,
  index,
  validationErrors,
  onChange,
  onRemove,
}: {
  id: string;
  variation: Variation;
  index: number;
  validationErrors?: ValidationIssueDisplay[];
  onChange: (v: Variation) => void;
  onRemove: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={{
        ...style,
        animationDelay: `${index * 50}ms`,
      }}
      className="animate-fade-up"
    >
      <VariationCard
        variation={variation}
        index={index}
        validationErrors={validationErrors}
        onChange={onChange}
        onRemove={onRemove}
        dragHandleProps={{ ref: setActivatorNodeRef, ...listeners, ...attributes }}
      />
    </div>
  );
}

export function VariationList({
  variations: rawVariations,
  validationErrors,
  onChange,
}: VariationListProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor),
  );

  // Backfill IDs on variations that don't have them
  const variations = useMemo(() => ensureIds(rawVariations), [rawVariations]);

  // Use variation.id as the stable key for dnd-kit
  const sortableIds = useMemo(() => variations.map((v) => v.id!), [variations]);

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;

      const oldIndex = sortableIds.indexOf(String(active.id));
      const newIndex = sortableIds.indexOf(String(over.id));
      if (oldIndex === -1 || newIndex === -1) return;

      onChange(arrayMove(variations, oldIndex, newIndex));
    },
    [sortableIds, variations, onChange],
  );

  const handleVariationChange = useCallback(
    (index: number, updated: Variation) => {
      const next = [...variations];
      next[index] = updated;
      onChange(next);
    },
    [variations, onChange],
  );

  const handleRemove = useCallback(
    (index: number) => {
      onChange(variations.filter((_, i) => i !== index));
    },
    [variations, onChange],
  );

  return (
    <div className="space-y-3">
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={sortableIds} strategy={verticalListSortingStrategy}>
          {variations.map((v, i) => (
            <SortableVariation
              key={v.id!}
              id={v.id!}
              variation={v}
              index={i}
              validationErrors={filterErrorsByPath(validationErrors, "variations", i)}
              onChange={(updated) => handleVariationChange(i, updated)}
              onRemove={() => handleRemove(i)}
            />
          ))}
        </SortableContext>
      </DndContext>
    </div>
  );
}
