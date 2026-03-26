import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { StringConditionEditor } from "./StringConditionEditor.js";
import type { Condition } from "showwhat";

describe("StringConditionEditor", () => {
  it("renders with a string condition in eq mode (shows plain Input)", () => {
    const condition = { type: "string", key: "userId", op: "eq", value: "abc" } as Condition;
    render(<StringConditionEditor condition={condition} onChange={vi.fn()} />);
    expect(screen.getByDisplayValue("userId")).toBeDefined();
    expect(screen.getByDisplayValue("abc")).toBeDefined();
  });

  it("renders regex mode with a plain input", () => {
    const condition = { type: "string", key: "email", op: "regex", value: "^test.*" } as Condition;
    render(<StringConditionEditor condition={condition} onChange={vi.fn()} />);
    expect(screen.getByDisplayValue("^test.*")).toBeDefined();
  });

  it("calls onChange when key changes", async () => {
    const onChange = vi.fn();
    const condition = { type: "string", key: "", op: "eq", value: "" } as Condition;
    render(<StringConditionEditor condition={condition} onChange={onChange} />);
    const keyInput = screen.getByPlaceholderText("e.g. userId");
    await userEvent.type(keyInput, "x");
    expect(onChange).toHaveBeenCalled();
    expect(onChange.mock.calls[0][0]).toEqual(
      expect.objectContaining({ type: "string", key: "x" }),
    );
  });

  it("calls onChange when regex value changes", async () => {
    const onChange = vi.fn();
    const condition = { type: "string", key: "k", op: "regex", value: "" } as Condition;
    render(<StringConditionEditor condition={condition} onChange={onChange} />);
    const input = screen.getByPlaceholderText("e.g. ^test.*$");
    await userEvent.type(input, "x");
    expect(onChange).toHaveBeenCalled();
  });

  it("calls onChange when operator changes", async () => {
    const onChange = vi.fn();
    const condition = { type: "string", key: "k", op: "eq", value: "v" } as Condition;
    render(<StringConditionEditor condition={condition} onChange={onChange} />);
    // Find the operator select combobox (not disabled)
    const comboboxes = screen.getAllByRole("combobox");
    const opSelect = comboboxes.find((c) => !c.hasAttribute("disabled"));
    expect(opSelect).toBeDefined();
    await userEvent.click(opSelect!);
    await userEvent.click(screen.getByText("neq"));
    expect(onChange).toHaveBeenCalled();
    expect(onChange.mock.calls[0][0]).toEqual(
      expect.objectContaining({ type: "string", op: "neq" }),
    );
  });

  it("calls onChange when tag value is added in 'in' mode", async () => {
    const onChange = vi.fn();
    const condition = { type: "string", key: "k", op: "in", value: [] } as Condition;
    render(<StringConditionEditor condition={condition} onChange={onChange} />);
    const tagInput = screen.getByPlaceholderText("e.g. user-123");
    await userEvent.type(tagInput, "val{Enter}");
    expect(onChange).toHaveBeenCalled();
  });

  it("renders with in operator (shows TagInput)", () => {
    const condition = { type: "string", key: "region", op: "in", value: ["us", "eu"] } as Condition;
    render(<StringConditionEditor condition={condition} onChange={vi.fn()} />);
    expect(screen.getByText("us")).toBeDefined();
    expect(screen.getByText("eu")).toBeDefined();
  });

  it("renders with eq operator (shows plain Input, not TagInput)", () => {
    const condition = { type: "string", key: "userId", op: "eq", value: "abc" } as Condition;
    render(<StringConditionEditor condition={condition} onChange={vi.fn()} />);
    expect(screen.getByDisplayValue("abc")).toBeDefined();
  });

  it("calls onChange when typing in plain text input (eq mode)", async () => {
    const onChange = vi.fn();
    const condition = { type: "string", key: "k", op: "eq", value: "" } as Condition;
    render(<StringConditionEditor condition={condition} onChange={onChange} />);
    const input = screen.getByPlaceholderText("e.g. user-123");
    await userEvent.type(input, "x");
    expect(onChange).toHaveBeenCalled();
    expect(onChange.mock.calls[0][0]).toEqual(
      expect.objectContaining({ type: "string", value: "x" }),
    );
  });

  it("switching op from eq to in with scalar value coerces to array", async () => {
    const onChange = vi.fn();
    const condition = { type: "string", key: "k", op: "eq", value: "hello" } as Condition;
    render(<StringConditionEditor condition={condition} onChange={onChange} />);
    const comboboxes = screen.getAllByRole("combobox");
    const opSelect = comboboxes.find((c) => !c.hasAttribute("disabled"));
    await userEvent.click(opSelect!);
    await userEvent.click(screen.getByText("in"));
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ op: "in", value: ["hello"] }));
  });

  it("switching op from in to eq with array extracts first element", async () => {
    const onChange = vi.fn();
    const condition = { type: "string", key: "k", op: "in", value: ["alpha", "beta"] } as Condition;
    render(<StringConditionEditor condition={condition} onChange={onChange} />);
    const comboboxes = screen.getAllByRole("combobox");
    const opSelect = comboboxes.find((c) => !c.hasAttribute("disabled"));
    await userEvent.click(opSelect!);
    await userEvent.click(screen.getByText("eq"));
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ op: "eq", value: "alpha" }));
  });

  it("switching op from in to eq with empty array yields empty string", async () => {
    const onChange = vi.fn();
    const condition = { type: "string", key: "k", op: "in", value: [] } as Condition;
    render(<StringConditionEditor condition={condition} onChange={onChange} />);
    const comboboxes = screen.getAllByRole("combobox");
    const opSelect = comboboxes.find((c) => !c.hasAttribute("disabled"));
    await userEvent.click(opSelect!);
    await userEvent.click(screen.getByText("eq"));
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ op: "eq", value: "" }));
  });

  it("switching op from eq to in with empty value yields empty array", async () => {
    const onChange = vi.fn();
    const condition = { type: "string", key: "k", op: "eq", value: "" } as Condition;
    render(<StringConditionEditor condition={condition} onChange={onChange} />);
    const comboboxes = screen.getAllByRole("combobox");
    const opSelect = comboboxes.find((c) => !c.hasAttribute("disabled"));
    await userEvent.click(opSelect!);
    await userEvent.click(screen.getByText("in"));
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ op: "in", value: [] }));
  });

  it("switching op from nin to in with existing array keeps it", async () => {
    const onChange = vi.fn();
    const condition = { type: "string", key: "k", op: "nin", value: ["a", "b"] } as Condition;
    render(<StringConditionEditor condition={condition} onChange={onChange} />);
    const comboboxes = screen.getAllByRole("combobox");
    const opSelect = comboboxes.find((c) => !c.hasAttribute("disabled"));
    await userEvent.click(opSelect!);
    await userEvent.click(screen.getByText("in"));
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ op: "in", value: ["a", "b"] }));
  });

  it("renders with undefined key, op, value hitting ?? fallbacks", () => {
    const condition = { type: "string" } as Condition;
    render(<StringConditionEditor condition={condition} onChange={vi.fn()} />);
    // key ?? "" → empty key input
    expect(screen.getByPlaceholderText("e.g. userId")).toBeDefined();
    // op ?? "eq" → shows eq in operator select
    // value ?? "" → empty value input
    expect(screen.getByPlaceholderText("e.g. user-123")).toBeDefined();
  });

  it("TagInput in 'in' mode triggers onChange on value change", async () => {
    const onChange = vi.fn();
    const condition = { type: "string", key: "k", op: "in", value: [] } as Condition;
    render(<StringConditionEditor condition={condition} onChange={onChange} />);
    const tagInput = screen.getByPlaceholderText("e.g. user-123");
    await userEvent.type(tagInput, "new{Enter}");
    expect(onChange).toHaveBeenCalled();
  });
});
