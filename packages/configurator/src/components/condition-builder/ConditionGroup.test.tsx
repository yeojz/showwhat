import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ConditionGroup } from "./ConditionGroup.js";
import type { Condition } from "showwhat";

describe("ConditionGroup", () => {
  const twoConditions: Condition[] = [
    { id: "c1", type: "env", op: "eq", value: "prod" },
    { id: "c2", type: "env", op: "eq", value: "staging" },
  ];

  it("renders with AND type and conditions", () => {
    render(
      <ConditionGroup
        type="and"
        conditions={twoConditions}
        onChange={vi.fn()}
        onRemove={vi.fn()}
      />,
    );
    expect(screen.getByText("L0 | and")).toBeDefined();
    expect(screen.getByText("2 conditions")).toBeDefined();
  });

  it("renders with OR type", () => {
    render(
      <ConditionGroup type="or" conditions={twoConditions} onChange={vi.fn()} onRemove={vi.fn()} />,
    );
    expect(screen.getByText("or")).toBeDefined();
  });

  it("calls onRemove when remove group button is clicked", () => {
    const onRemove = vi.fn();
    render(
      <ConditionGroup
        type="and"
        conditions={twoConditions}
        onChange={vi.fn()}
        onRemove={onRemove}
      />,
    );
    fireEvent.click(screen.getByLabelText("Remove condition group"));
    expect(onRemove).toHaveBeenCalledOnce();
  });

  it("calls onChange when a condition inside group is moved down", () => {
    const onChange = vi.fn();
    render(
      <ConditionGroup
        type="and"
        conditions={twoConditions}
        onChange={onChange}
        onRemove={vi.fn()}
      />,
    );
    // The first condition's move down button
    const moveDownButtons = screen.getAllByLabelText("Move down");
    // Find the enabled one (first item can move down)
    const enabledMoveDown = moveDownButtons.find((btn) => !btn.hasAttribute("disabled"));
    expect(enabledMoveDown).toBeDefined();
    fireEvent.click(enabledMoveDown!);
    expect(onChange).toHaveBeenCalledOnce();
    const result = onChange.mock.calls[0][0];
    expect(result[0].value).toBe("staging");
    expect(result[1].value).toBe("prod");
  });

  it("calls onChange when a condition inside group is moved up", () => {
    const onChange = vi.fn();
    render(
      <ConditionGroup
        type="and"
        conditions={twoConditions}
        onChange={onChange}
        onRemove={vi.fn()}
      />,
    );
    // The second condition's move up button
    const moveUpButtons = screen.getAllByLabelText("Move up");
    // The second move up should be enabled
    const enabledMoveUp = moveUpButtons.filter((btn) => !btn.hasAttribute("disabled"));
    expect(enabledMoveUp.length).toBeGreaterThan(0);
    fireEvent.click(enabledMoveUp[enabledMoveUp.length - 1]);
    expect(onChange).toHaveBeenCalledOnce();
  });

  it("calls onChange when a condition inside group is removed", () => {
    const onChange = vi.fn();
    render(
      <ConditionGroup
        type="and"
        conditions={twoConditions}
        onChange={onChange}
        onRemove={vi.fn()}
      />,
    );
    // Remove the first condition
    const removeButtons = screen.getAllByLabelText("Remove condition");
    fireEvent.click(removeButtons[0]);
    expect(onChange).toHaveBeenCalledOnce();
    expect(onChange.mock.calls[0][0]).toHaveLength(1);
  });

  it("calls onChange when a condition is modified", async () => {
    const onChange = vi.fn();
    const conditions: Condition[] = [
      { id: "c1", type: "string", key: "userId", op: "eq", value: "abc" },
    ];
    render(
      <ConditionGroup type="and" conditions={conditions} onChange={onChange} onRemove={vi.fn()} />,
    );
    // Find the key input (not disabled) and change it
    const keyInput = screen.getByDisplayValue("userId");
    fireEvent.change(keyInput, { target: { value: "changed" } });
    expect(onChange).toHaveBeenCalled();
  });

  it("shows singular condition text for single condition", () => {
    render(
      <ConditionGroup
        type="and"
        conditions={[{ id: "c1", type: "env", op: "eq", value: "prod" }]}
        onChange={vi.fn()}
        onRemove={vi.fn()}
      />,
    );
    expect(screen.getByText("1 condition")).toBeDefined();
  });

  it("renders move buttons from props", () => {
    const onMoveUp = vi.fn();
    const onMoveDown = vi.fn();
    render(
      <ConditionGroup
        type="and"
        conditions={[{ id: "c1", type: "env", op: "eq", value: "prod" }]}
        onChange={vi.fn()}
        onRemove={vi.fn()}
        onMoveUp={onMoveUp}
        onMoveDown={onMoveDown}
      />,
    );
    // The group itself should have move buttons in its header
    const moveUpButtons = screen.getAllByLabelText("Move up");
    const moveDownButtons = screen.getAllByLabelText("Move down");
    expect(moveUpButtons.length).toBeGreaterThanOrEqual(1);
    expect(moveDownButtons.length).toBeGreaterThanOrEqual(1);
  });
});
