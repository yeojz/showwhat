import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NumberConditionEditor } from "./NumberConditionEditor.js";
import type { Condition } from "@showwhat/core/schemas";

describe("NumberConditionEditor", () => {
  it("renders with a number condition", () => {
    const condition = { type: "number", key: "score", op: "gt", value: 100 } as Condition;
    render(<NumberConditionEditor condition={condition} onChange={vi.fn()} />);
    expect(screen.getByDisplayValue("score")).toBeDefined();
    expect(screen.getByDisplayValue("100")).toBeDefined();
  });

  it("calls onChange when key changes", async () => {
    const onChange = vi.fn();
    const condition = { type: "number", key: "", op: "eq", value: 0 } as Condition;
    render(<NumberConditionEditor condition={condition} onChange={onChange} />);
    const keyInput = screen.getByPlaceholderText("e.g. score");
    await userEvent.type(keyInput, "s");
    expect(onChange).toHaveBeenCalled();
  });

  it("calls onChange when number value changes", () => {
    const onChange = vi.fn();
    const condition = { type: "number", key: "score", op: "eq", value: 0 } as Condition;
    render(<NumberConditionEditor condition={condition} onChange={onChange} />);
    const numInput = screen.getByDisplayValue("0");
    fireEvent.change(numInput, { target: { value: "42" } });
    expect(onChange).toHaveBeenCalled();
    const result = onChange.mock.calls[0][0] as Record<string, unknown>;
    expect(result.value).toBe(42);
  });

  it("sets value to empty string when input is cleared", () => {
    const onChange = vi.fn();
    const condition = { type: "number", key: "score", op: "eq", value: 42 } as Condition;
    render(<NumberConditionEditor condition={condition} onChange={onChange} />);
    const numInput = screen.getByDisplayValue("42");
    fireEvent.change(numInput, { target: { value: "" } });
    expect(onChange).toHaveBeenCalled();
    const result = onChange.mock.calls[0][0] as Record<string, unknown>;
    expect(result.value).toBe("");
  });

  it("calls onChange when operator changes", async () => {
    const onChange = vi.fn();
    const condition = { type: "number", key: "score", op: "eq", value: 42 } as Condition;
    render(<NumberConditionEditor condition={condition} onChange={onChange} />);
    // Find the operator select combobox (not disabled)
    const comboboxes = screen.getAllByRole("combobox");
    const opSelect = comboboxes.find((c) => !c.hasAttribute("disabled"));
    expect(opSelect).toBeDefined();
    await userEvent.click(opSelect!);
    await userEvent.click(screen.getByText("gt"));
    expect(onChange).toHaveBeenCalled();
    expect(onChange.mock.calls[0][0]).toEqual(
      expect.objectContaining({ type: "number", op: "gt" }),
    );
  });
});
