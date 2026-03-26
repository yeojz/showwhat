import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NumberConditionEditor } from "./NumberConditionEditor.js";
import type { Condition } from "showwhat";

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

  it("coerces scalar value to array when switching from eq to in", async () => {
    const onChange = vi.fn();
    const condition = { type: "number", key: "score", op: "eq", value: 42 } as Condition;
    render(<NumberConditionEditor condition={condition} onChange={onChange} />);
    const comboboxes = screen.getAllByRole("combobox");
    const opSelect = comboboxes.find((c) => !c.hasAttribute("disabled"));
    await userEvent.click(opSelect!);
    await userEvent.click(screen.getByText("in"));
    expect(onChange).toHaveBeenCalled();
    const result = onChange.mock.calls[0][0] as Record<string, unknown>;
    expect(result.op).toBe("in");
    expect(result.value).toEqual([42]);
  });

  it("gives empty array when switching to in with empty value", async () => {
    const onChange = vi.fn();
    const condition = { type: "number", key: "score", op: "eq", value: "" } as Condition;
    render(<NumberConditionEditor condition={condition} onChange={onChange} />);
    const comboboxes = screen.getAllByRole("combobox");
    const opSelect = comboboxes.find((c) => !c.hasAttribute("disabled"));
    await userEvent.click(opSelect!);
    await userEvent.click(screen.getByText("in"));
    const result = onChange.mock.calls[0][0] as Record<string, unknown>;
    expect(result.op).toBe("in");
    expect(result.value).toEqual([]);
  });

  it("gives empty array when switching to nin with undefined value", async () => {
    const onChange = vi.fn();
    const condition = { type: "number", key: "score", op: "eq" } as Condition;
    render(<NumberConditionEditor condition={condition} onChange={onChange} />);
    const comboboxes = screen.getAllByRole("combobox");
    const opSelect = comboboxes.find((c) => !c.hasAttribute("disabled"));
    await userEvent.click(opSelect!);
    await userEvent.click(screen.getByText("nin"));
    const result = onChange.mock.calls[0][0] as Record<string, unknown>;
    expect(result.op).toBe("nin");
    expect(result.value).toEqual([]);
  });

  it("extracts first element from array when switching from in to eq", async () => {
    const onChange = vi.fn();
    const condition = { type: "number", key: "score", op: "in", value: [10, 20, 30] } as Condition;
    render(<NumberConditionEditor condition={condition} onChange={onChange} />);
    const comboboxes = screen.getAllByRole("combobox");
    const opSelect = comboboxes.find((c) => !c.hasAttribute("disabled"));
    await userEvent.click(opSelect!);
    await userEvent.click(screen.getByText("eq"));
    const result = onChange.mock.calls[0][0] as Record<string, unknown>;
    expect(result.op).toBe("eq");
    expect(result.value).toBe(10);
  });

  it("gives 0 when switching from in to eq with empty array", async () => {
    const onChange = vi.fn();
    const condition = { type: "number", key: "score", op: "in", value: [] } as Condition;
    render(<NumberConditionEditor condition={condition} onChange={onChange} />);
    const comboboxes = screen.getAllByRole("combobox");
    const opSelect = comboboxes.find((c) => !c.hasAttribute("disabled"));
    await userEvent.click(opSelect!);
    await userEvent.click(screen.getByText("eq"));
    const result = onChange.mock.calls[0][0] as Record<string, unknown>;
    expect(result.op).toBe("eq");
    expect(result.value).toBe(0);
  });

  it("extracts first element from array when switching from in to gt", async () => {
    const onChange = vi.fn();
    const condition = { type: "number", key: "score", op: "in", value: [5, 15] } as Condition;
    render(<NumberConditionEditor condition={condition} onChange={onChange} />);
    const comboboxes = screen.getAllByRole("combobox");
    const opSelect = comboboxes.find((c) => !c.hasAttribute("disabled"));
    await userEvent.click(opSelect!);
    await userEvent.click(screen.getByText("gt"));
    const result = onChange.mock.calls[0][0] as Record<string, unknown>;
    expect(result.op).toBe("gt");
    expect(result.value).toBe(5);
  });

  it("renders NumberTagInput when op is in", () => {
    const condition = { type: "number", key: "score", op: "in", value: [1, 2] } as Condition;
    render(<NumberConditionEditor condition={condition} onChange={vi.fn()} />);
    // NumberTagInput renders badges for each value
    expect(screen.getByText("1")).toBeDefined();
    expect(screen.getByText("2")).toBeDefined();
    // Should not render a regular number input with displayValue
    expect(screen.queryByDisplayValue("1")).toBeNull();
  });

  it("renders NumberTagInput when op is nin", () => {
    const condition = { type: "number", key: "score", op: "nin", value: [7] } as Condition;
    render(<NumberConditionEditor condition={condition} onChange={vi.fn()} />);
    expect(screen.getByText("7")).toBeDefined();
    expect(screen.getByLabelText("Remove 7")).toBeDefined();
  });

  it("keeps array value when switching from in to nin", async () => {
    const onChange = vi.fn();
    const condition = { type: "number", key: "score", op: "in", value: [3, 6] } as Condition;
    render(<NumberConditionEditor condition={condition} onChange={onChange} />);
    const comboboxes = screen.getAllByRole("combobox");
    const opSelect = comboboxes.find((c) => !c.hasAttribute("disabled"));
    await userEvent.click(opSelect!);
    await userEvent.click(screen.getByText("nin"));
    const result = onChange.mock.calls[0][0] as Record<string, unknown>;
    expect(result.op).toBe("nin");
    expect(result.value).toEqual([3, 6]);
  });

  it("renders with fallback defaults when key and op are undefined", () => {
    const condition = { type: "number" } as Condition;
    render(<NumberConditionEditor condition={condition} onChange={vi.fn()} />);
    // key falls back to "" via rec.key ?? ""
    expect(screen.getByPlaceholderText("e.g. score")).toBeDefined();
  });

  it("renders NumberTagInput with fallback empty array when value is undefined in array mode", () => {
    const condition = { type: "number", key: "score", op: "in" } as Condition;
    render(<NumberConditionEditor condition={condition} onChange={vi.fn()} />);
    // NumberTagInput receives [] via (rec.value as number | number[]) ?? []
    expect(screen.getByPlaceholderText("e.g. 200")).toBeDefined();
  });

  it("calls onChange when NumberTagInput value changes", async () => {
    const onChange = vi.fn();
    const condition = { type: "number", key: "score", op: "in", value: [10] } as Condition;
    render(<NumberConditionEditor condition={condition} onChange={onChange} />);
    const tagInput = screen.getByPlaceholderText("");
    await userEvent.type(tagInput, "20{Enter}");
    expect(onChange).toHaveBeenCalled();
  });

  it("keeps scalar value when switching between non-array ops", async () => {
    const onChange = vi.fn();
    const condition = { type: "number", key: "score", op: "gt", value: 50 } as Condition;
    render(<NumberConditionEditor condition={condition} onChange={onChange} />);
    const comboboxes = screen.getAllByRole("combobox");
    const opSelect = comboboxes.find((c) => !c.hasAttribute("disabled"));
    await userEvent.click(opSelect!);
    await userEvent.click(screen.getByText("lte"));
    const result = onChange.mock.calls[0][0] as Record<string, unknown>;
    expect(result.op).toBe("lte");
    expect(result.value).toBe(50);
  });
});
