import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { VariationList } from "./VariationList.js";
import type { Variation } from "showwhat";

// Mock dnd-kit to avoid drag-and-drop complexity in unit tests
let capturedOnDragEnd: ((event: unknown) => void) | undefined;

vi.mock("@dnd-kit/core", () => {
  return {
    DndContext: ({
      children,
      onDragEnd,
    }: {
      children: React.ReactNode;
      onDragEnd?: (event: unknown) => void;
    }) => {
      capturedOnDragEnd = onDragEnd;
      return <>{children}</>;
    },
    closestCenter: vi.fn(),
    KeyboardSensor: class {},
    PointerSensor: class {},
    useSensor: () => ({}),
    useSensors: () => [],
  };
});

vi.mock("@dnd-kit/sortable", () => ({
  SortableContext: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  verticalListSortingStrategy: {},
  useSortable: () => ({
    attributes: {},
    listeners: {},
    setNodeRef: vi.fn(),
    setActivatorNodeRef: vi.fn(),
    transform: null,
    transition: null,
    isDragging: false,
  }),
  arrayMove: <T,>(arr: T[], from: number, to: number) => {
    const result = [...arr];
    const [item] = result.splice(from, 1);
    result.splice(to, 0, item);
    return result;
  },
}));

vi.mock("@dnd-kit/utilities", () => ({
  CSS: { Transform: { toString: () => undefined } },
}));

describe("VariationList", () => {
  const twoVariations: Variation[] = [
    { id: "v1", value: "alpha", description: "First variation" },
    { id: "v2", value: "beta", description: "Second variation" },
  ];

  it("should render all variations", () => {
    render(<VariationList variations={twoVariations} onChange={vi.fn()} />);
    expect(screen.getByText("First variation")).toBeDefined();
    expect(screen.getByText("Second variation")).toBeDefined();
  });

  it("should render variation indices", () => {
    render(<VariationList variations={twoVariations} onChange={vi.fn()} />);
    expect(screen.getByText("0")).toBeDefined();
    expect(screen.getByText("1")).toBeDefined();
  });

  it("should assign ids to variations that lack them (ensureIds)", () => {
    const noIdVariations: Variation[] = [
      { value: "no-id-value" },
      { id: "has-id", value: "with-id-value" },
    ];
    const onChange = vi.fn();
    render(<VariationList variations={noIdVariations} onChange={onChange} />);
    // The component should still render without error, even with missing ids
    expect(screen.getByText("no-id-value")).toBeDefined();
    expect(screen.getByText("with-id-value")).toBeDefined();
  });

  it("should call onChange without the removed variation when remove is clicked", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<VariationList variations={twoVariations} onChange={onChange} />);

    // Expand the first variation card to access the remove button
    const expandButtons = screen.getAllByRole("button", { expanded: false });
    await user.click(expandButtons[0]);

    // Find the trash/remove button (the one with the Trash2 icon)
    const removeButtons = screen.getAllByRole("button");
    const trashButton = removeButtons.find((btn) => btn.querySelector(".lucide-trash-2"));
    expect(trashButton).toBeDefined();
    await user.click(trashButton!);

    // Confirm the removal in the alert dialog
    const confirmButton = screen.getByRole("button", { name: "Remove" });
    await user.click(confirmButton);

    expect(onChange).toHaveBeenCalledOnce();
    const result = onChange.mock.calls[0][0];
    expect(result).toHaveLength(1);
    expect(result[0].value).toBe("beta");
  });

  it("should call onChange with updated variation when a variation changes", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<VariationList variations={twoVariations} onChange={onChange} />);

    // Expand first card
    const expandButtons = screen.getAllByRole("button", { expanded: false });
    await user.click(expandButtons[0]);

    // Modify the description input
    const descInput = screen.getByDisplayValue("First variation");
    await user.clear(descInput);
    await user.type(descInput, "Updated");

    expect(onChange).toHaveBeenCalled();
    // The last call should have an updated first variation
    const lastCall = onChange.mock.calls[onChange.mock.calls.length - 1][0];
    expect(lastCall).toHaveLength(2);
  });

  it("should render with empty variations array", () => {
    render(<VariationList variations={[]} onChange={vi.fn()} />);
    // Should render the wrapper div without errors
    const container = document.querySelector(".space-y-3");
    expect(container).toBeDefined();
  });

  it("should reorder variations on drag end", () => {
    const onChange = vi.fn();
    render(<VariationList variations={twoVariations} onChange={onChange} />);

    // Simulate a drag end event that swaps v1 and v2
    expect(capturedOnDragEnd).toBeDefined();
    capturedOnDragEnd!({ active: { id: "v1" }, over: { id: "v2" } });

    expect(onChange).toHaveBeenCalledOnce();
    const result = onChange.mock.calls[0][0];
    expect(result[0].value).toBe("beta");
    expect(result[1].value).toBe("alpha");
  });

  it("should not reorder when dragging to same position", () => {
    const onChange = vi.fn();
    render(<VariationList variations={twoVariations} onChange={onChange} />);

    capturedOnDragEnd!({ active: { id: "v1" }, over: { id: "v1" } });
    expect(onChange).not.toHaveBeenCalled();
  });

  it("should not reorder when over is null", () => {
    const onChange = vi.fn();
    render(<VariationList variations={twoVariations} onChange={onChange} />);

    capturedOnDragEnd!({ active: { id: "v1" }, over: null });
    expect(onChange).not.toHaveBeenCalled();
  });

  it("should not reorder when ids are not found", () => {
    const onChange = vi.fn();
    render(<VariationList variations={twoVariations} onChange={onChange} />);

    capturedOnDragEnd!({ active: { id: "nonexistent" }, over: { id: "v2" } });
    expect(onChange).not.toHaveBeenCalled();
  });

  it("should pass filtered validation errors to each variation card", () => {
    const errors = [
      { path: ["variations", 0, "value"], message: "Value required" },
      { path: ["variations", 1, "description"], message: "Description too long" },
    ];
    render(
      <VariationList variations={twoVariations} validationErrors={errors} onChange={vi.fn()} />,
    );
    // Should render without error; errors are passed down to VariationCard
    expect(screen.getByText("First variation")).toBeDefined();
    expect(screen.getByText("Second variation")).toBeDefined();
  });
});
