import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ConditionBlock } from "./ConditionBlock.js";
import type { Condition } from "showwhat";
import type { ValidationIssueDisplay } from "../../types.js";
import { ConditionExtensionsProvider } from "./ConditionExtensionsContext.js";

describe("ConditionBlock", () => {
  it("renders a leaf condition with its registered label", () => {
    const condition: Condition = { type: "env", op: "eq", value: "prod" };
    render(<ConditionBlock condition={condition} onChange={vi.fn()} onRemove={vi.fn()} />);
    expect(screen.getByText("Environment")).toBeDefined();
  });

  it("renders an AND group via ConditionGroup", () => {
    const condition: Condition = {
      type: "and",
      conditions: [{ id: "c1", type: "env", op: "eq", value: "prod" }],
    };
    const onChange = vi.fn();
    render(<ConditionBlock condition={condition} onChange={onChange} onRemove={vi.fn()} />);
    expect(screen.getByText(/AND/)).toBeDefined();
  });

  it("renders an OR group via ConditionGroup", () => {
    const condition: Condition = {
      type: "or",
      conditions: [{ id: "c1", type: "env", op: "eq", value: "prod" }],
    };
    const onChange = vi.fn();
    render(<ConditionBlock condition={condition} onChange={onChange} onRemove={vi.fn()} />);
    expect(screen.getByText(/OR/)).toBeDefined();
  });

  it("calls onChange with buildAndCondition when AND group children change", () => {
    const condition: Condition = {
      type: "and",
      id: "grp-1",
      conditions: [
        { id: "c1", type: "env", op: "eq", value: "prod" },
        { id: "c2", type: "env", op: "eq", value: "staging" },
      ],
    };
    const onChange = vi.fn();
    render(<ConditionBlock condition={condition} onChange={onChange} onRemove={vi.fn()} />);
    // Remove a condition inside the group to trigger onChange
    const removeButtons = screen.getAllByLabelText("Remove condition");
    removeButtons[0].click();
    expect(onChange).toHaveBeenCalled();
    const result = onChange.mock.calls[0][0];
    expect(result.type).toBe("and");
    expect(result.id).toBe("grp-1");
  });

  it("calls onChange with buildOrCondition when OR group children change", () => {
    const condition: Condition = {
      type: "or",
      id: "grp-2",
      conditions: [
        { id: "c1", type: "env", op: "eq", value: "prod" },
        { id: "c2", type: "env", op: "eq", value: "staging" },
      ],
    };
    const onChange = vi.fn();
    render(<ConditionBlock condition={condition} onChange={onChange} onRemove={vi.fn()} />);
    const removeButtons = screen.getAllByLabelText("Remove condition");
    removeButtons[0].click();
    expect(onChange).toHaveBeenCalled();
    const result = onChange.mock.calls[0][0];
    expect(result.type).toBe("or");
    expect(result.id).toBe("grp-2");
  });

  it("falls back to condition.type as label when meta is not found", () => {
    const condition = { type: "unknownType" } as Condition;
    render(<ConditionBlock condition={condition} onChange={vi.fn()} onRemove={vi.fn()} />);
    expect(screen.getByText("unknownType")).toBeDefined();
  });

  it("falls back to 'Custom' when type is empty and meta is not found", () => {
    const condition = { type: "" } as Condition;
    render(<ConditionBlock condition={condition} onChange={vi.fn()} onRemove={vi.fn()} />);
    expect(screen.getByText("Custom")).toBeDefined();
  });

  it("uses extension label when condition type matches an extra condition type", () => {
    const condition = { type: "myExtension" } as Condition;
    const extensions = {
      extraConditionTypes: [
        { type: "myExtension", label: "My Extension", description: "", defaults: {} },
      ],
      editorOverrides: new Map(),
    };
    render(
      <ConditionExtensionsProvider value={extensions}>
        <ConditionBlock condition={condition} onChange={vi.fn()} onRemove={vi.fn()} />
      </ConditionExtensionsProvider>,
    );
    expect(screen.getByText("My Extension")).toBeDefined();
  });

  it("calls onRemove when remove button is clicked", async () => {
    const onRemove = vi.fn();
    const condition: Condition = { type: "env", op: "eq", value: "prod" };
    render(<ConditionBlock condition={condition} onChange={vi.fn()} onRemove={onRemove} />);
    await userEvent.click(screen.getByLabelText("Remove condition"));
    expect(onRemove).toHaveBeenCalledOnce();
  });

  it("renders error messages with field paths", () => {
    const condition: Condition = { type: "env", op: "eq", value: "" };
    const errors: ValidationIssueDisplay[] = [{ path: ["value"], message: "Required" }];
    render(
      <ConditionBlock
        condition={condition}
        onChange={vi.fn()}
        onRemove={vi.fn()}
        errors={errors}
      />,
    );
    expect(screen.getByText("value:")).toBeDefined();
    expect(screen.getByText("Required")).toBeDefined();
  });

  it("renders error messages without field path when path is empty", () => {
    const condition: Condition = { type: "env", op: "eq", value: "" };
    const errors: ValidationIssueDisplay[] = [{ path: [], message: "Something went wrong" }];
    render(
      <ConditionBlock
        condition={condition}
        onChange={vi.fn()}
        onRemove={vi.fn()}
        errors={errors}
      />,
    );
    expect(screen.getByText("Something went wrong")).toBeDefined();
  });

  it("rephrases generic Zod 'Invalid input' error message", () => {
    const condition: Condition = { type: "env", op: "eq", value: "" };
    const errors: ValidationIssueDisplay[] = [{ path: [], message: "Invalid input" }];
    render(
      <ConditionBlock
        condition={condition}
        onChange={vi.fn()}
        onRemove={vi.fn()}
        errors={errors}
      />,
    );
    expect(screen.getByText("Invalid condition — check required fields")).toBeDefined();
  });

  it("does not render error section when errors array is empty", () => {
    const condition: Condition = { type: "env", op: "eq", value: "prod" };
    render(
      <ConditionBlock condition={condition} onChange={vi.fn()} onRemove={vi.fn()} errors={[]} />,
    );
    expect(screen.queryByText("text-destructive")).toBeNull();
  });

  it("renders errors with dotted paths (nested path)", () => {
    const condition: Condition = { type: "env", op: "eq", value: "" };
    const errors: ValidationIssueDisplay[] = [
      { path: ["conditions", 0, "value"], message: "Must not be empty" },
    ];
    render(
      <ConditionBlock
        condition={condition}
        onChange={vi.fn()}
        onRemove={vi.fn()}
        errors={errors}
      />,
    );
    expect(screen.getByText("conditions.0.value:")).toBeDefined();
    expect(screen.getByText("Must not be empty")).toBeDefined();
  });
});
