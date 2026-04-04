import { describe, it, expect, vi } from "vitest";
import "@testing-library/jest-dom/vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CustomConditionEditor } from "./CustomConditionEditor.js";
import type { Condition } from "showwhat";

describe("CustomConditionEditor", () => {
  it("renders with a custom condition showing type and args", () => {
    const condition = { type: "geoLocation", region: "us-east" } as Condition;
    render(<CustomConditionEditor condition={condition} onChange={vi.fn()} />);
    expect(screen.getByDisplayValue("geoLocation")).toBeDefined();
    const textarea = screen.getByPlaceholderText(/region/);
    expect(textarea).toBeDefined();
    expect((textarea as HTMLTextAreaElement).value).toContain("us-east");
  });

  it("calls onChange when type changes", async () => {
    const onChange = vi.fn();
    const condition = { type: "" } as Condition;
    render(<CustomConditionEditor condition={condition} onChange={onChange} />);
    const typeInput = screen.getByPlaceholderText("e.g. geoLocation, percentage");
    await userEvent.type(typeInput, "x");
    expect(onChange).toHaveBeenCalled();
    expect(onChange.mock.calls[0][0]).toEqual(expect.objectContaining({ type: "x" }));
  });

  it("commits args on blur with valid JSON", () => {
    const onChange = vi.fn();
    const condition = { type: "custom" } as Condition;
    render(<CustomConditionEditor condition={condition} onChange={onChange} />);
    const textarea = screen.getByPlaceholderText(/region/);
    fireEvent.change(textarea, { target: { value: '{"key": "val"}' } });
    fireEvent.blur(textarea);
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ type: "custom", key: "val" }));
  });

  it("shows error on blur with invalid JSON", () => {
    const onChange = vi.fn();
    const condition = { type: "custom" } as Condition;
    render(<CustomConditionEditor condition={condition} onChange={onChange} />);
    const textarea = screen.getByPlaceholderText(/region/);
    fireEvent.change(textarea, { target: { value: "not json" } });
    fireEvent.blur(textarea);
    expect(screen.getByText("Invalid JSON")).toBeDefined();
    expect(onChange).not.toHaveBeenCalled();
  });

  it("shows error when args is not an object (e.g. array)", () => {
    const onChange = vi.fn();
    const condition = { type: "custom" } as Condition;
    render(<CustomConditionEditor condition={condition} onChange={onChange} />);
    const textarea = screen.getByPlaceholderText(/region/);
    fireEvent.change(textarea, { target: { value: "[1,2,3]" } });
    fireEvent.blur(textarea);
    expect(screen.getByText("Args must be a JSON object")).toBeDefined();
  });

  it("clears args when textarea is empty on blur", () => {
    const onChange = vi.fn();
    const condition = { type: "custom", key: "val" } as Condition;
    render(<CustomConditionEditor condition={condition} onChange={onChange} />);
    const textarea = screen.getByPlaceholderText(/region/);
    fireEvent.change(textarea, { target: { value: "" } });
    fireEvent.blur(textarea);
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ type: "custom" }));
    expect(onChange.mock.calls[0][0]).not.toHaveProperty("key");
  });

  it("resyncs text when condition prop changes while not focused", () => {
    const condition1 = { type: "custom", key: "val1" } as Condition;
    const condition2 = { type: "custom", key: "val2" } as Condition;
    const { rerender } = render(
      <CustomConditionEditor condition={condition1} onChange={vi.fn()} />,
    );
    rerender(<CustomConditionEditor condition={condition2} onChange={vi.fn()} />);
    const textarea = screen.getByPlaceholderText(/region/) as HTMLTextAreaElement;
    expect(textarea.value).toContain("val2");
  });

  it("preserves id when committing args", () => {
    const onChange = vi.fn();
    const condition = { type: "custom", id: "my-id" } as Condition;
    render(<CustomConditionEditor condition={condition} onChange={onChange} />);
    const textarea = screen.getByPlaceholderText(/region/);
    fireEvent.change(textarea, { target: { value: '{"foo":"bar"}' } });
    fireEvent.blur(textarea);
    expect(onChange.mock.calls[0][0]).toEqual(
      expect.objectContaining({ type: "custom", id: "my-id", foo: "bar" }),
    );
  });

  it("does not resync text while textarea is focused", () => {
    const condition1 = { type: "custom", key: "val1" } as Condition;
    const condition2 = { type: "custom", key: "val2" } as Condition;
    const { rerender } = render(
      <CustomConditionEditor condition={condition1} onChange={vi.fn()} />,
    );
    // Focus the textarea
    const textarea = screen.getByPlaceholderText(/region/);
    fireEvent.focus(textarea);
    // Rerender with new condition while focused
    rerender(<CustomConditionEditor condition={condition2} onChange={vi.fn()} />);
    // The text should NOT have changed because the textarea is focused
    expect((textarea as HTMLTextAreaElement).value).toContain("val1");
  });

  it("preserves id when clearing args", () => {
    const onChange = vi.fn();
    const condition = { type: "custom", id: "my-id", key: "val" } as Condition;
    render(<CustomConditionEditor condition={condition} onChange={onChange} />);
    const textarea = screen.getByPlaceholderText(/region/);
    fireEvent.change(textarea, { target: { value: "" } });
    fireEvent.blur(textarea);
    expect(onChange.mock.calls[0][0]).toEqual(
      expect.objectContaining({ type: "custom", id: "my-id" }),
    );
  });

  it("renders type input with empty string when type is undefined (rec.type ?? '' fallback)", () => {
    const condition = { key: "val" } as Condition;
    render(<CustomConditionEditor condition={condition} onChange={vi.fn()} />);
    const typeInput = screen.getByPlaceholderText(
      "e.g. geoLocation, percentage",
    ) as HTMLInputElement;
    expect(typeInput.value).toBe("");
  });

  it("does not resync text when derived text equals current text (derived !== text is false)", () => {
    // condition1 has args {key: "val"}, condition2 has different type but same args
    const condition1 = { type: "custom", key: "val" } as Condition;
    const condition2 = { type: "different", key: "val" } as Condition;
    const { rerender } = render(
      <CustomConditionEditor condition={condition1} onChange={vi.fn()} />,
    );
    const textarea = screen.getByPlaceholderText(/region/) as HTMLTextAreaElement;
    const textBefore = textarea.value;
    // Rerender with a different condition object, but same extracted args text
    rerender(<CustomConditionEditor condition={condition2} onChange={vi.fn()} />);
    // Text should remain the same since derived === text
    expect(textarea.value).toBe(textBefore);
  });

  it("shows preset override footnote when isPresetBacked is true", () => {
    render(
      <CustomConditionEditor
        condition={{ type: "segment", region: "us" } as never}
        onChange={vi.fn()}
        isPresetBacked
      />,
    );
    expect(screen.getByText(/overridden by the preset/i)).toBeInTheDocument();
  });

  it("does not show preset override footnote by default", () => {
    render(
      <CustomConditionEditor
        condition={{ type: "segment", region: "us" } as never}
        onChange={vi.fn()}
      />,
    );
    expect(screen.queryByText(/overridden by the preset/i)).not.toBeInTheDocument();
  });
});
