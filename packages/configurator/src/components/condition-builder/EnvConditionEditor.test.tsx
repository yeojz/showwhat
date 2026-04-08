import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { EnvConditionEditor } from "./EnvConditionEditor.js";
import type { Condition } from "showwhat";

describe("EnvConditionEditor", () => {
  it("renders with a normal env condition with value", () => {
    const condition = { type: "env", value: ["production", "staging"] } as Condition;
    render(<EnvConditionEditor condition={condition} onChange={vi.fn()} />);
    expect(screen.getByText("production")).toBeDefined();
    expect(screen.getByText("staging")).toBeDefined();
  });

  it("renders with undefined value to hit ?? fallback", () => {
    const condition = { type: "env" } as Condition;
    render(<EnvConditionEditor condition={condition} onChange={vi.fn()} />);
    // Should render without error, falling back to ""
    expect(screen.getByPlaceholderText("e.g. production")).toBeDefined();
  });

  it("renders with null value to hit ?? fallback", () => {
    const condition = { type: "env", value: null } as unknown as Condition;
    render(<EnvConditionEditor condition={condition} onChange={vi.fn()} />);
    expect(screen.getByPlaceholderText("e.g. production")).toBeDefined();
  });

  it("calls onChange when tag input value changes", async () => {
    const onChange = vi.fn();
    const condition = { type: "env", value: [] } as Condition;
    render(<EnvConditionEditor condition={condition} onChange={onChange} />);
    const tagInput = screen.getByPlaceholderText("e.g. production");
    await userEvent.type(tagInput, "staging{Enter}");
    expect(onChange).toHaveBeenCalled();
  });
});
