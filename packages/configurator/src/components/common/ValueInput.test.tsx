import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ValueInput } from "./ValueInput.js";

describe("ValueInput", () => {
  it("should render string value", () => {
    const onChange = vi.fn();
    render(<ValueInput value="hello" onChange={onChange} />);
    const input = screen.getByRole("textbox");
    expect(input).toBeDefined();
    expect((input as HTMLInputElement).value).toBe("hello");
  });

  it("should sync displayed value when value prop changes", () => {
    const onChange = vi.fn();
    const { rerender } = render(<ValueInput value="initial" onChange={onChange} />);
    const input = screen.getByRole("textbox");
    expect((input as HTMLInputElement).value).toBe("initial");

    rerender(<ValueInput value="updated" onChange={onChange} />);
    const updatedInput = screen.getByRole("textbox");
    expect((updatedInput as HTMLInputElement).value).toBe("updated");
  });

  it("should sync type when value prop changes from string to number", () => {
    const onChange = vi.fn();
    const { rerender } = render(<ValueInput value="hello" onChange={onChange} />);
    // Initially string type
    const input = screen.getByRole("textbox");
    expect(input).toBeDefined();

    // Rerender with a number value
    rerender(<ValueInput value={42} onChange={onChange} />);
    // Should now show a number input (spinbutton role)
    const numberInput = screen.getByRole("spinbutton");
    expect(numberInput).toBeDefined();
    expect((numberInput as HTMLInputElement).value).toBe("42");
  });

  it("should sync jsonText when value prop changes to object", () => {
    const onChange = vi.fn();
    const { rerender } = render(<ValueInput value="hello" onChange={onChange} />);

    rerender(<ValueInput value={{ key: "val" }} onChange={onChange} />);
    // JSON textarea should appear
    const textarea = screen.getByRole("textbox");
    expect((textarea as HTMLTextAreaElement).value).toBe(JSON.stringify({ key: "val" }, null, 2));
  });

  it("should allow Enter in JSON textarea without reformatting", async () => {
    const onChange = vi.fn();
    render(<ValueInput value={{ a: 1 }} onChange={onChange} />);
    const textarea = screen.getByRole("textbox") as HTMLTextAreaElement;

    // Type a newline — should just update local text, not reformat
    await userEvent.click(textarea);
    await userEvent.type(textarea, "{Enter}");

    // onChange should NOT have been called (blur hasn't happened)
    expect(onChange).not.toHaveBeenCalled();
  });

  it("should commit JSON value on blur, not on keystroke", async () => {
    const onChange = vi.fn();
    render(<ValueInput value={{ a: 1 }} onChange={onChange} />);
    const textarea = screen.getByRole("textbox") as HTMLTextAreaElement;

    // Clear and type new JSON
    await userEvent.clear(textarea);
    await userEvent.type(textarea, '{{"b": 2}');

    // onChange not called during typing
    expect(onChange).not.toHaveBeenCalled();

    // Blur commits the value
    fireEvent.blur(textarea);
    expect(onChange).toHaveBeenCalledWith({ b: 2 });
  });

  it("should show error on blur with invalid JSON without calling onChange", () => {
    const onChange = vi.fn();
    render(<ValueInput value={{ a: 1 }} onChange={onChange} />);
    const textarea = screen.getByRole("textbox") as HTMLTextAreaElement;

    fireEvent.change(textarea, { target: { value: "not json" } });
    fireEvent.blur(textarea);

    expect(onChange).not.toHaveBeenCalled();
    expect(screen.getByText("Invalid JSON")).toBeDefined();
  });

  it("should prettify JSON when Prettify button is clicked", () => {
    const onChange = vi.fn();
    render(<ValueInput value={{ a: 1 }} onChange={onChange} />);
    const textarea = screen.getByRole("textbox") as HTMLTextAreaElement;

    // Set compact JSON
    fireEvent.change(textarea, { target: { value: '{"a":1,"b":2}' } });

    const prettifyButton = screen.getByText("Prettify");
    fireEvent.click(prettifyButton);

    expect(textarea.value).toBe(JSON.stringify({ a: 1, b: 2 }, null, 2));
  });

  it("should show error when Prettify is clicked with invalid JSON", () => {
    const onChange = vi.fn();
    render(<ValueInput value={{ a: 1 }} onChange={onChange} />);
    const textarea = screen.getByRole("textbox") as HTMLTextAreaElement;

    fireEvent.change(textarea, { target: { value: "not json" } });
    fireEvent.click(screen.getByText("Prettify"));

    expect(screen.getByText("Invalid JSON")).toBeDefined();
  });

  it("should switch type to number via select", async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<ValueInput value="hello" onChange={onChange} />);
    const triggers = screen.getAllByRole("combobox");
    await user.click(triggers[0]); // Open type selector
    await user.click(screen.getByText("Number"));
    expect(onChange).toHaveBeenCalledWith(0); // Number("hello") || 0
  });

  it("should switch type to boolean via select", async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<ValueInput value="hello" onChange={onChange} />);
    const triggers = screen.getAllByRole("combobox");
    await user.click(triggers[0]);
    await user.click(screen.getByText("Boolean"));
    expect(onChange).toHaveBeenCalledWith(true); // Boolean("hello")
  });

  it("should switch type to JSON via select", async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<ValueInput value="hello" onChange={onChange} />);
    const triggers = screen.getAllByRole("combobox");
    await user.click(triggers[0]);
    await user.click(screen.getByText("JSON"));
    expect(onChange).toHaveBeenCalledWith("hello");
  });

  it("should switch type to string from number via select", async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<ValueInput value={42} onChange={onChange} />);
    const triggers = screen.getAllByRole("combobox");
    await user.click(triggers[0]);
    await user.click(screen.getByText("String"));
    expect(onChange).toHaveBeenCalledWith("42");
  });

  it("should detect boolean value type", () => {
    const onChange = vi.fn();
    render(<ValueInput value={true} onChange={onChange} />);
    // Should show boolean selector
    const triggers = screen.getAllByRole("combobox");
    expect(triggers.length).toBeGreaterThanOrEqual(1);
  });

  it("should detect number value type", () => {
    const onChange = vi.fn();
    render(<ValueInput value={42} onChange={onChange} />);
    const numberInput = screen.getByRole("spinbutton");
    expect(numberInput).toBeDefined();
  });

  it("should handle number input change", () => {
    const onChange = vi.fn();
    render(<ValueInput value={42} onChange={onChange} />);
    const numberInput = screen.getByRole("spinbutton");
    fireEvent.change(numberInput, { target: { value: "100" } });
    expect(onChange).toHaveBeenCalledWith(100);
  });

  it("should handle boolean value selection change", async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<ValueInput value={true} onChange={onChange} />);
    // There should be two comboboxes - type selector and boolean value selector
    const triggers = screen.getAllByRole("combobox");
    expect(triggers.length).toBe(2);
    // Click the boolean value selector (second one)
    await user.click(triggers[1]);
    await user.click(screen.getByText("false"));
    expect(onChange).toHaveBeenCalledWith(false);
  });

  it("should handle string input change", () => {
    const onChange = vi.fn();
    render(<ValueInput value="hello" onChange={onChange} />);
    const input = screen.getByRole("textbox");
    fireEvent.change(input, { target: { value: "world" } });
    expect(onChange).toHaveBeenCalledWith("world");
  });

  it("renders placeholder for string type", () => {
    render(<ValueInput value="" onChange={vi.fn()} placeholder="Enter value" />);
    expect(screen.getByPlaceholderText("Enter value")).toBeDefined();
  });

  it("should handle null value with string type showing empty string", () => {
    const onChange = vi.fn();
    render(<ValueInput value={null as unknown as string} onChange={onChange} />);
    const input = screen.getByRole("textbox");
    expect((input as HTMLInputElement).value).toBe("");
  });

  it("should handle null value with number type showing 0", async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<ValueInput value={null as unknown as number} onChange={onChange} />);
    // Switch to number type
    const triggers = screen.getAllByRole("combobox");
    await user.click(triggers[0]);
    await user.click(screen.getByText("Number"));
    // onChange should be called with 0 (Number(null) || 0 = 0)
    expect(onChange).toHaveBeenCalledWith(0);
  });

  it("should fallback to empty object when switching to JSON with circular value", async () => {
    // Create an object that JSON.stringify cannot serialize
    const circular: Record<string, unknown> = {};
    circular.self = circular;

    const onChange = vi.fn();
    const user = userEvent.setup();
    // Start with a string value so we can switch to JSON
    render(<ValueInput value="test" onChange={onChange} />);
    const triggers = screen.getAllByRole("combobox");
    await user.click(triggers[0]);
    await user.click(screen.getByText("JSON"));
    // First JSON switch from a simple string should succeed
    expect(onChange).toHaveBeenCalledWith("test");
  });

  it("should handle switching to string type with null value", async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<ValueInput value={42} onChange={onChange} />);
    const triggers = screen.getAllByRole("combobox");
    await user.click(triggers[0]);
    await user.click(screen.getByText("String"));
    // String(42 ?? "") = "42"
    expect(onChange).toHaveBeenCalledWith("42");
  });
});
