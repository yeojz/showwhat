import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { StartAtConditionEditor } from "./StartAtConditionEditor.js";
import type { Condition } from "@showwhat/core/schemas";

describe("StartAtConditionEditor", () => {
  it("renders with a startAt condition", () => {
    const condition = { type: "startAt", value: "2025-01-01T00:00:00Z" } as Condition;
    render(<StartAtConditionEditor condition={condition} onChange={vi.fn()} />);
    const keyInput = screen.getByDisplayValue("at");
    expect(keyInput).toBeDefined();
    expect(keyInput).toHaveProperty("disabled", true);
  });

  it("calls onChange when date value changes", () => {
    const onChange = vi.fn();
    const condition = { type: "startAt", value: "2025-01-01T00:00:00Z" } as Condition;
    render(<StartAtConditionEditor condition={condition} onChange={onChange} />);
    const dateInput = screen.getByDisplayValue(/2025/);
    fireEvent.change(dateInput, { target: { value: "2025-06-15T12:00" } });
    expect(onChange).toHaveBeenCalled();
    const result = onChange.mock.calls[0][0] as Record<string, unknown>;
    expect(result.type).toBe("startAt");
  });

  it("renders with empty value", () => {
    const condition = { type: "startAt" } as Condition;
    render(<StartAtConditionEditor condition={condition} onChange={vi.fn()} />);
    expect(screen.getByDisplayValue("at")).toBeDefined();
  });
});
