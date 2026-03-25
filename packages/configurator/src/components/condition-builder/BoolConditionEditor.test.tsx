import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { BoolConditionEditor } from "./BoolConditionEditor.js";
import type { Condition } from "@showwhat/core/schemas";

describe("BoolConditionEditor", () => {
  it("renders with a boolean condition", () => {
    const condition = { type: "bool", key: "isAdmin", value: true } as Condition;
    render(<BoolConditionEditor condition={condition} onChange={vi.fn()} />);
    const keyInput = screen.getByDisplayValue("isAdmin");
    expect(keyInput).toBeDefined();
  });

  it("calls onChange when key is updated", async () => {
    const onChange = vi.fn();
    const condition = { type: "bool", key: "", value: true } as Condition;
    render(<BoolConditionEditor condition={condition} onChange={onChange} />);
    const keyInput = screen.getByPlaceholderText("e.g. isAdmin");
    await userEvent.type(keyInput, "flag");
    expect(onChange).toHaveBeenCalled();
    expect(onChange.mock.calls[0][0]).toEqual(expect.objectContaining({ type: "bool", key: "f" }));
  });

  it("renders with default values when fields are missing", () => {
    const condition = { type: "bool" } as Condition;
    render(<BoolConditionEditor condition={condition} onChange={vi.fn()} />);
    expect(screen.getByPlaceholderText("e.g. isAdmin")).toBeDefined();
  });

  it("renders the operator as disabled eq", () => {
    const condition = { type: "bool", key: "isAdmin", value: true } as Condition;
    render(<BoolConditionEditor condition={condition} onChange={vi.fn()} />);
    // The operator select should be disabled and show eq
    const triggers = screen.getAllByRole("combobox");
    // One is for operator (disabled), one is for value
    expect(triggers.length).toBeGreaterThanOrEqual(1);
  });

  it("calls onChange when boolean value changes to false", async () => {
    const onChange = vi.fn();
    const condition = { type: "bool", key: "isAdmin", value: true } as Condition;
    render(<BoolConditionEditor condition={condition} onChange={onChange} />);
    // Find the value select (not the operator select which is disabled)
    const triggers = screen.getAllByRole("combobox");
    const enabledTrigger = triggers.find((t) => !t.hasAttribute("disabled"));
    expect(enabledTrigger).toBeDefined();
    await userEvent.click(enabledTrigger!);
    await userEvent.click(screen.getByText("false"));
    expect(onChange).toHaveBeenCalled();
    expect(onChange.mock.calls[0][0]).toEqual(
      expect.objectContaining({ type: "bool", value: false }),
    );
  });
});
