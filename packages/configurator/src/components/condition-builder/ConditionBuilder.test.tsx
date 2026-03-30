import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ConditionBuilder } from "./ConditionBuilder.js";
import type { Condition } from "showwhat";

describe("ConditionBuilder", () => {
  it("should render empty state with add button", () => {
    const onChange = vi.fn();
    render(<ConditionBuilder conditions={[]} onChange={onChange} />);
    expect(screen.getByText("Add condition")).toBeDefined();
  });

  it("should render condition blocks with type labels", () => {
    const conditions: Condition[] = [
      { type: "env", op: "eq", value: "production" },
      { type: "string", key: "userId", op: "eq", value: "abc" },
    ];
    const onChange = vi.fn();
    render(<ConditionBuilder conditions={conditions} onChange={onChange} />);
    expect(screen.getAllByText("Environment").length).toBeGreaterThan(0);
    expect(screen.getByText("String")).toBeDefined();
  });

  it("should call onChange when removing a condition", () => {
    const conditions: Condition[] = [{ type: "env", op: "eq", value: "production" }];
    const onChange = vi.fn();
    render(<ConditionBuilder conditions={conditions} onChange={onChange} />);
    // The X button has the destructive class
    const buttons = screen.getAllByRole("button");
    const xButton = buttons.find((btn) => btn.querySelector(".lucide-x"));
    expect(xButton).toBeDefined();
    fireEvent.click(xButton!);
    expect(onChange).toHaveBeenCalledOnce();
    expect(onChange.mock.calls[0][0]).toHaveLength(0);
  });

  it("should show move up/down buttons for reordering", () => {
    const conditions: Condition[] = [
      { type: "env", op: "eq", value: "production" },
      { type: "env", op: "eq", value: "staging" },
    ];
    const onChange = vi.fn();
    render(<ConditionBuilder conditions={conditions} onChange={onChange} />);
    const moveUpButtons = screen.getAllByLabelText("Move up");
    const moveDownButtons = screen.getAllByLabelText("Move down");
    expect(moveUpButtons).toHaveLength(2);
    expect(moveDownButtons).toHaveLength(2);
    // First item's move up should be disabled
    expect(moveUpButtons[0]).toHaveProperty("disabled", true);
    // Last item's move down should be disabled
    expect(moveDownButtons[1]).toHaveProperty("disabled", true);
  });

  it("should reorder conditions when move down is clicked", () => {
    const conditions: Condition[] = [
      { type: "env", op: "eq", value: "production" },
      { type: "env", op: "eq", value: "staging" },
    ];
    const onChange = vi.fn();
    render(<ConditionBuilder conditions={conditions} onChange={onChange} />);
    // Click move down on first item (it should be enabled)
    const moveDownButtons = screen.getAllByLabelText("Move down");
    fireEvent.click(moveDownButtons[0]);
    expect(onChange).toHaveBeenCalledOnce();
    const result = onChange.mock.calls[0][0];
    expect(result[0].value).toBe("staging");
    expect(result[1].value).toBe("production");
  });

  it("should reorder conditions when move up is clicked", () => {
    const conditions: Condition[] = [
      { type: "env", op: "eq", value: "production" },
      { type: "env", op: "eq", value: "staging" },
    ];
    const onChange = vi.fn();
    render(<ConditionBuilder conditions={conditions} onChange={onChange} />);
    const moveUpButtons = screen.getAllByLabelText("Move up");
    // Second item move up should be enabled
    fireEvent.click(moveUpButtons[1]);
    expect(onChange).toHaveBeenCalledOnce();
    const result = onChange.mock.calls[0][0];
    expect(result[0].value).toBe("staging");
    expect(result[1].value).toBe("production");
  });

  it("should render AND/OR groups with nested conditions", () => {
    const conditions: Condition[] = [
      {
        type: "and",
        conditions: [
          { type: "env", op: "eq", value: "prod" },
          { type: "string", key: "region", op: "eq", value: "us" },
        ],
      },
    ];
    const onChange = vi.fn();
    render(<ConditionBuilder conditions={conditions} onChange={onChange} />);
    expect(screen.getByText("L1 | and")).toBeDefined();
  });

  it("should remove condition group when X button is clicked", () => {
    const conditions: Condition[] = [
      {
        type: "and",
        conditions: [{ type: "env", op: "eq", value: "prod" }],
      },
    ];
    const onChange = vi.fn();
    render(<ConditionBuilder conditions={conditions} onChange={onChange} />);
    // Find the remove button for the group
    const removeBtn = screen.getByLabelText("Remove condition group");
    fireEvent.click(removeBtn);
    expect(onChange).toHaveBeenCalledOnce();
    expect(onChange.mock.calls[0][0]).toHaveLength(0);
  });

  it("should handle adding a condition via the menu in a group", () => {
    const conditions: Condition[] = [
      {
        type: "and",
        conditions: [{ type: "env", op: "eq", value: "prod" }],
      },
    ];
    const onChange = vi.fn();
    render(<ConditionBuilder conditions={conditions} onChange={onChange} />);
    // There should be multiple "Add condition" buttons - one for top level, one inside the group
    const addButtons = screen.getAllByText("Add condition");
    expect(addButtons.length).toBeGreaterThanOrEqual(2);
  });
});
