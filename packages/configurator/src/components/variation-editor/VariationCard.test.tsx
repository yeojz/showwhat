import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { VariationCard } from "./VariationCard.js";
import type { Variation } from "@showwhat/core/schemas";

describe("VariationCard", () => {
  const defaultVariation: Variation = {
    value: "test-value",
    description: "A test variation",
    conditions: [{ type: "env", op: "eq", value: "production" }],
  };

  it("should render the variation index", () => {
    render(
      <VariationCard
        variation={defaultVariation}
        index={0}
        onChange={vi.fn()}
        onRemove={vi.fn()}
      />,
    );
    expect(screen.getByText("0")).toBeDefined();
  });

  it("should show description as summary text in collapsed header", () => {
    render(
      <VariationCard
        variation={defaultVariation}
        index={0}
        onChange={vi.fn()}
        onRemove={vi.fn()}
      />,
    );
    expect(screen.getByText("A test variation")).toBeDefined();
  });

  it("should fall back to value when description is missing", () => {
    render(
      <VariationCard
        variation={{ value: "my-value" }}
        index={1}
        onChange={vi.fn()}
        onRemove={vi.fn()}
      />,
    );
    expect(screen.getByText("my-value")).toBeDefined();
  });

  it("should render the description input when expanded", async () => {
    const user = userEvent.setup();
    render(
      <VariationCard
        variation={defaultVariation}
        index={0}
        onChange={vi.fn()}
        onRemove={vi.fn()}
      />,
    );
    // Expand the card
    await user.click(screen.getByRole("button", { expanded: false }));
    const descInput = screen.getByDisplayValue("A test variation");
    expect(descInput).toBeDefined();
  });

  it("should render condition blocks when expanded", async () => {
    const user = userEvent.setup();
    render(
      <VariationCard
        variation={defaultVariation}
        index={0}
        onChange={vi.fn()}
        onRemove={vi.fn()}
      />,
    );
    // Expand the card
    await user.click(screen.getByRole("button", { expanded: false }));
    // Should have a condition type selector (combobox)
    expect(screen.getAllByRole("combobox").length).toBeGreaterThan(0);
  });

  it("should call onChange when description is modified", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <VariationCard
        variation={defaultVariation}
        index={0}
        onChange={onChange}
        onRemove={vi.fn()}
      />,
    );
    await user.click(screen.getByRole("button", { expanded: false }));
    const descInput = screen.getByDisplayValue("A test variation");
    await user.clear(descInput);
    await user.type(descInput, "Updated");
    expect(onChange).toHaveBeenCalled();
  });

  it("should clear description to undefined when empty", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <VariationCard
        variation={defaultVariation}
        index={0}
        onChange={onChange}
        onRemove={vi.fn()}
      />,
    );
    await user.click(screen.getByRole("button", { expanded: false }));
    const descInput = screen.getByDisplayValue("A test variation");
    await user.clear(descInput);
    // The last call should have description undefined
    const lastCall = onChange.mock.calls[onChange.mock.calls.length - 1][0];
    expect(lastCall.description).toBeUndefined();
  });

  it("should show condition summary dialog when eye icon is clicked", async () => {
    const user = userEvent.setup();
    render(
      <VariationCard
        variation={defaultVariation}
        index={0}
        onChange={vi.fn()}
        onRemove={vi.fn()}
      />,
    );
    await user.click(screen.getByRole("button", { expanded: false }));
    // Find the eye button (condition summary trigger)
    const buttons = screen.getAllByRole("button");
    const eyeButton = buttons.find((btn) => btn.querySelector(".lucide-eye"));
    expect(eyeButton).toBeDefined();
    await user.click(eyeButton!);
    expect(screen.getByText("Condition Summary")).toBeDefined();
    expect(screen.getByText("Evaluation logic for this variation")).toBeDefined();
  });

  it("should hide condition count and eye when no conditions", () => {
    render(
      <VariationCard
        variation={{ value: "test-value" }}
        index={0}
        onChange={vi.fn()}
        onRemove={vi.fn()}
      />,
    );
    expect(screen.queryByText(/condition/)).toBeNull();
  });

  it("should show condition count in collapsed header", () => {
    render(
      <VariationCard
        variation={defaultVariation}
        index={0}
        onChange={vi.fn()}
        onRemove={vi.fn()}
      />,
    );
    expect(screen.getByText("1 condition")).toBeDefined();
  });

  it("should show plural condition count", () => {
    const multiCondition = {
      ...defaultVariation,
      conditions: [
        { type: "env" as const, op: "eq" as const, value: "prod" },
        { type: "env" as const, op: "eq" as const, value: "staging" },
      ],
    };
    render(
      <VariationCard variation={multiCondition} index={0} onChange={vi.fn()} onRemove={vi.fn()} />,
    );
    expect(screen.getByText("2 conditions")).toBeDefined();
  });

  it("should call onChange with conditions removed when conditions become empty", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <VariationCard
        variation={defaultVariation}
        index={0}
        onChange={onChange}
        onRemove={vi.fn()}
      />,
    );
    await user.click(screen.getByRole("button", { expanded: false }));
    // Remove the condition
    const removeBtn = screen.getByLabelText("Remove condition");
    await user.click(removeBtn);
    expect(onChange).toHaveBeenCalled();
    const lastCall = onChange.mock.calls[onChange.mock.calls.length - 1][0];
    expect(lastCall.conditions).toBeUndefined();
  });

  it("should call onChange when value input changes", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <VariationCard
        variation={{ value: "original", description: "test" }}
        index={0}
        onChange={onChange}
        onRemove={vi.fn()}
      />,
    );
    await user.click(screen.getByRole("button", { expanded: false }));
    // Find the string value input (ValueInput renders a text input for string values)
    const valueInput = screen.getByDisplayValue("original");
    await user.clear(valueInput);
    await user.type(valueInput, "new-value");
    expect(onChange).toHaveBeenCalled();
  });

  it("shows validation errors outside of conditions when expanded", async () => {
    const user = userEvent.setup();
    render(
      <VariationCard
        variation={{ value: "" }}
        index={0}
        validationErrors={[{ path: ["value"], message: "Value is required" }]}
        onChange={vi.fn()}
        onRemove={vi.fn()}
      />,
    );
    await user.click(screen.getByRole("button", { expanded: false }));
    expect(screen.getByText("Value is required")).toBeDefined();
  });
});
