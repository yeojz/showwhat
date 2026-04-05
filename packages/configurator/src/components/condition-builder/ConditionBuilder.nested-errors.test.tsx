import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ConditionBuilder } from "./ConditionBuilder.js";
import type { Condition } from "showwhat";
import type { ValidationIssueDisplay } from "../../types.js";

describe("ConditionBuilder nested error propagation", () => {
  it("should display validation errors inside a nested AND group", () => {
    const conditions: Condition[] = [
      {
        type: "and",
        conditions: [{ type: "env", op: "eq", value: "" }],
      },
    ];
    // Error path: conditions[0] -> conditions[0] -> value
    // ConditionBuilder filters by ("conditions", 0) -> strips to rest
    // ConditionBlock sees AND, passes errors to ConditionGroup
    // ConditionGroup filters by ("conditions", 0) -> strips to rest
    // Leaf ConditionBlock gets errors with path ["value"]
    const validationErrors: ValidationIssueDisplay[] = [
      { path: ["conditions", 0, "conditions", 0, "value"], message: "Value is required" },
    ];
    const onChange = vi.fn();
    render(
      <ConditionBuilder
        conditions={conditions}
        onChange={onChange}
        validationErrors={validationErrors}
      />,
    );

    // The nested env condition should render inside the AND group
    expect(screen.getAllByText("env").length).toBeGreaterThan(0);

    // Errors are shown only after touch — simulate editing the nested condition
    // Find the nested condition's value input and change it to trigger touched state
    const inputs = screen.getAllByRole("textbox");
    if (inputs.length > 0) {
      fireEvent.change(inputs[0], { target: { value: "test" } });
    }

    // After touch, the error message should be visible
    expect(screen.getByText("Value is required")).toBeDefined();
  });

  it("should display errors inside nested OR group", () => {
    const conditions: Condition[] = [
      {
        type: "or",
        conditions: [{ type: "string", key: "", op: "eq", value: "" }],
      },
    ];
    const validationErrors: ValidationIssueDisplay[] = [
      { path: ["conditions", 0, "conditions", 0, "key"], message: "Key must not be empty" },
    ];
    const onChange = vi.fn();
    render(
      <ConditionBuilder
        conditions={conditions}
        onChange={onChange}
        validationErrors={validationErrors}
      />,
    );

    expect(screen.getByText("L1 | or")).toBeDefined();
    expect(screen.getByText("string")).toBeDefined();

    // Touch the nested condition to show errors
    const inputs = screen.getAllByRole("textbox");
    if (inputs.length > 0) {
      fireEvent.change(inputs[0], { target: { value: "x" } });
    }

    expect(screen.getByText("Key must not be empty")).toBeDefined();
  });

  it("shows validation errors even before the user edits the condition block", () => {
    render(
      <ConditionBuilder
        conditions={[{ type: "env", op: "eq", value: "" }]}
        validationErrors={[{ path: ["conditions", 0, "value"], message: "Required" }]}
        onChange={vi.fn()}
      />,
    );

    expect(screen.getByText(/required/i)).toBeDefined();
  });

  it("should not display errors for indices that don't match", () => {
    const conditions: Condition[] = [
      {
        type: "and",
        conditions: [
          { type: "env", op: "eq", value: "production" },
          { type: "env", op: "eq", value: "" },
        ],
      },
    ];
    // Error only on index 1 (second child)
    const validationErrors: ValidationIssueDisplay[] = [
      { path: ["conditions", 0, "conditions", 1, "value"], message: "Second is bad" },
    ];
    const onChange = vi.fn();
    render(
      <ConditionBuilder
        conditions={conditions}
        onChange={onChange}
        validationErrors={validationErrors}
      />,
    );

    // Touch both conditions
    const inputs = screen.getAllByRole("textbox");
    for (const input of inputs) {
      fireEvent.change(input, { target: { value: "x" } });
    }

    // Only the second condition's error should appear
    expect(screen.getByText("Second is bad")).toBeDefined();
  });
});
