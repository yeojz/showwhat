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
});
