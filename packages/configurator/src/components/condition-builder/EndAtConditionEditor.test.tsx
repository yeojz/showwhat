import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { EndAtConditionEditor } from "./EndAtConditionEditor.js";
import type { Condition } from "showwhat";

describe("EndAtConditionEditor", () => {
  it("renders with an endAt condition", () => {
    const condition = { type: "endAt", value: "2025-06-01T00:00:00Z" } as Condition;
    render(<EndAtConditionEditor condition={condition} onChange={vi.fn()} />);
    // Should render date value
    expect(screen.getByDisplayValue(/2025/)).toBeDefined();
  });

  it("calls onChange when date value changes", () => {
    const onChange = vi.fn();
    const condition = { type: "endAt", value: "2025-06-01T00:00:00Z" } as Condition;
    render(<EndAtConditionEditor condition={condition} onChange={onChange} />);
    // Find the datetime-local input
    const dateInput = screen.getByDisplayValue(/2025/);
    fireEvent.change(dateInput, { target: { value: "2025-12-31T23:59" } });
    expect(onChange).toHaveBeenCalled();
    const result = onChange.mock.calls[0][0] as Record<string, unknown>;
    expect(result.type).toBe("endAt");
  });

  it("renders with empty value", () => {
    const condition = { type: "endAt" } as Condition;
    render(<EndAtConditionEditor condition={condition} onChange={vi.fn()} />);
    // Should render without error
    expect(screen.getByPlaceholderText("ISO 8601 datetime")).toBeDefined();
  });

  it("renders with explicit undefined value using empty string fallback", () => {
    const condition = { type: "endAt", value: undefined } as unknown as Condition;
    render(<EndAtConditionEditor condition={condition} onChange={vi.fn()} />);
    expect(screen.getByPlaceholderText("ISO 8601 datetime")).toBeDefined();
  });

  it("renders with null value using empty string fallback", () => {
    const condition = { type: "endAt", value: null } as unknown as Condition;
    render(<EndAtConditionEditor condition={condition} onChange={vi.fn()} />);
    expect(screen.getByPlaceholderText("ISO 8601 datetime")).toBeDefined();
  });

  it("calls onChange with endAt type when date value is changed from null", () => {
    const onChange = vi.fn();
    const condition = { type: "endAt", value: null } as unknown as Condition;
    render(<EndAtConditionEditor condition={condition} onChange={onChange} />);
    // Raw mode is the default
    const rawInput = screen.getByPlaceholderText("ISO 8601 datetime");
    fireEvent.change(rawInput, { target: { value: "2025-12-31T23:59:00Z" } });
    expect(onChange).toHaveBeenCalled();
    const result = onChange.mock.calls[0][0] as Record<string, unknown>;
    expect(result.type).toBe("endAt");
  });
});
