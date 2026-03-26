import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DatetimeConditionEditor } from "./DatetimeConditionEditor.js";
import type { Condition } from "showwhat";

describe("DatetimeConditionEditor", () => {
  it("renders with a datetime condition", () => {
    const condition = {
      type: "datetime",
      key: "createdAt",
      op: "eq",
      value: "2025-01-01T00:00:00Z",
    } as Condition;
    render(<DatetimeConditionEditor condition={condition} onChange={vi.fn()} />);
    expect(screen.getByDisplayValue("createdAt")).toBeDefined();
  });

  it("calls onChange when key changes", async () => {
    const onChange = vi.fn();
    const condition = {
      type: "datetime",
      key: "",
      op: "eq",
      value: "2025-01-01T00:00:00Z",
    } as Condition;
    render(<DatetimeConditionEditor condition={condition} onChange={onChange} />);
    const keyInput = screen.getByPlaceholderText("e.g. at");
    await userEvent.type(keyInput, "t");
    expect(onChange).toHaveBeenCalled();
    expect(onChange.mock.calls[0][0]).toEqual(
      expect.objectContaining({ type: "datetime", key: "t" }),
    );
  });

  it("calls onChange when date value changes", () => {
    const onChange = vi.fn();
    const condition = {
      type: "datetime",
      key: "at",
      op: "eq",
      value: "2025-01-01T00:00:00Z",
    } as Condition;
    render(<DatetimeConditionEditor condition={condition} onChange={onChange} />);
    const dateInput = screen.getByDisplayValue(/2025/);
    fireEvent.change(dateInput, { target: { value: "2025-12-31T23:59" } });
    expect(onChange).toHaveBeenCalled();
    const result = onChange.mock.calls[0][0] as Record<string, unknown>;
    expect(result.type).toBe("datetime");
  });

  it("renders with missing fields using defaults", () => {
    const condition = { type: "datetime" } as Condition;
    render(<DatetimeConditionEditor condition={condition} onChange={vi.fn()} />);
    expect(screen.getByPlaceholderText("e.g. at")).toBeDefined();
  });

  it("calls onChange when operator changes via select", async () => {
    const onChange = vi.fn();
    const condition = {
      type: "datetime",
      key: "at",
      op: "eq",
      value: "2025-01-01T00:00:00Z",
    } as Condition;
    render(<DatetimeConditionEditor condition={condition} onChange={onChange} />);
    // The OperatorSelect is a Radix Select, trigger it by role
    const trigger = screen.getByRole("combobox");
    await userEvent.click(trigger);
    // Pick "gt" from the dropdown options
    const gtOption = await screen.findByRole("option", { name: "gt" });
    await userEvent.click(gtOption);
    expect(onChange).toHaveBeenCalled();
    const result = onChange.mock.calls[0][0] as Record<string, unknown>;
    expect(result.type).toBe("datetime");
    expect(result.op).toBe("gt");
  });

  it("renders with undefined value using empty string fallback", () => {
    const condition = { type: "datetime", key: "at", op: "eq" } as Condition;
    render(<DatetimeConditionEditor condition={condition} onChange={vi.fn()} />);
    expect(screen.getByPlaceholderText("e.g. at")).toBeDefined();
  });

  it("renders with undefined op showing eq as default", () => {
    const condition = { type: "datetime", key: "at", value: "2025-01-01T00:00:00Z" } as Condition;
    render(<DatetimeConditionEditor condition={condition} onChange={vi.fn()} />);
    // Radix Select shows the value text inside the trigger
    const trigger = screen.getByRole("combobox");
    expect(trigger.textContent).toContain("eq");
  });

  it("renders with undefined key using empty string fallback", () => {
    const condition = { type: "datetime", op: "gt", value: "2025-01-01T00:00:00Z" } as Condition;
    render(<DatetimeConditionEditor condition={condition} onChange={vi.fn()} />);
    const trigger = screen.getByRole("combobox");
    expect(trigger.textContent).toContain("gt");
  });

  it("renders with null key using empty string fallback", () => {
    const condition = {
      type: "datetime",
      key: null,
      op: "eq",
      value: "2025-01-01T00:00:00Z",
    } as unknown as Condition;
    render(<DatetimeConditionEditor condition={condition} onChange={vi.fn()} />);
    expect(screen.getByPlaceholderText("e.g. at")).toBeDefined();
  });

  it("renders with null op using eq fallback", () => {
    const condition = {
      type: "datetime",
      key: "at",
      op: null,
      value: "2025-01-01T00:00:00Z",
    } as unknown as Condition;
    render(<DatetimeConditionEditor condition={condition} onChange={vi.fn()} />);
    const trigger = screen.getByRole("combobox");
    expect(trigger.textContent).toContain("eq");
  });

  it("renders with null value using empty string fallback", () => {
    const condition = {
      type: "datetime",
      key: "at",
      op: "eq",
      value: null,
    } as unknown as Condition;
    render(<DatetimeConditionEditor condition={condition} onChange={vi.fn()} />);
    expect(screen.getByPlaceholderText("e.g. at")).toBeDefined();
  });
});
