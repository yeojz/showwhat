import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { EndAtConditionEditor } from "./EndAtConditionEditor.js";
import type { Condition } from "@showwhat/core/schemas";

describe("EndAtConditionEditor", () => {
  it("renders with an endAt condition", () => {
    const condition = { type: "endAt", value: "2025-06-01T00:00:00Z" } as Condition;
    render(<EndAtConditionEditor condition={condition} onChange={vi.fn()} />);
    // Key should show "at" disabled
    const keyInput = screen.getByDisplayValue("at");
    expect(keyInput).toBeDefined();
    expect(keyInput).toHaveProperty("disabled", true);
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
    expect(screen.getByDisplayValue("at")).toBeDefined();
  });
});
