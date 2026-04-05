import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { DateTimeInput } from "./DateTimeInput.js";

describe("DateTimeInput", () => {
  it("should render with the given value in raw mode by default", () => {
    const onChange = vi.fn();
    render(<DateTimeInput value="2025-01-15T10:00:00.000Z" onChange={onChange} />);
    const input = screen.getByRole("textbox");
    expect((input as HTMLInputElement).value).toBe("2025-01-15T10:00:00.000Z");
  });

  it("should sync rawValue when value prop changes", () => {
    const onChange = vi.fn();
    const { rerender } = render(
      <DateTimeInput value="2025-01-15T10:00:00.000Z" onChange={onChange} />,
    );

    const input = screen.getByRole("textbox");
    expect((input as HTMLInputElement).value).toBe("2025-01-15T10:00:00.000Z");

    // Rerender with a new value
    rerender(<DateTimeInput value="2025-06-20T14:30:00.000Z" onChange={onChange} />);
    const updatedInput = screen.getByRole("textbox");
    expect((updatedInput as HTMLInputElement).value).toBe("2025-06-20T14:30:00.000Z");
  });

  it("should handle invalid date strings gracefully", () => {
    const onChange = vi.fn();
    render(<DateTimeInput value="not-a-date" onChange={onChange} />);
    const input = screen.getByRole("textbox");
    expect((input as HTMLInputElement).value).toBe("not-a-date");
  });

  it("should call onChange when raw input changes", () => {
    const onChange = vi.fn();
    render(<DateTimeInput value="2025-01-15T10:00:00.000Z" onChange={onChange} />);
    const input = screen.getByRole("textbox");
    fireEvent.change(input, { target: { value: "2025-12-25T00:00:00.000Z" } });
    expect(onChange).toHaveBeenCalledWith("2025-12-25T00:00:00.000Z");
  });

  it("should switch from raw mode to date picker and back", () => {
    const onChange = vi.fn();
    render(<DateTimeInput value="2025-01-15T10:00:00.000Z" onChange={onChange} />);
    // Starts in raw mode
    expect(screen.getByRole("textbox")).toBeDefined();
    // Switch to date picker
    fireEvent.click(screen.getByLabelText("Switch to date picker"));
    const dateInputs = document.querySelectorAll("input[type='datetime-local']");
    expect(dateInputs.length).toBe(1);
    // Switch back to raw mode
    fireEvent.click(screen.getByLabelText("Switch to raw input"));
    expect(screen.getByRole("textbox")).toBeDefined();
  });

  it("should call onChange when datetime-local input changes", () => {
    const onChange = vi.fn();
    render(<DateTimeInput value="2025-01-15T10:00:00.000Z" onChange={onChange} />);
    // Switch to date picker
    fireEvent.click(screen.getByLabelText("Switch to date picker"));
    const dateInputs = document.querySelectorAll("input[type='datetime-local']");
    expect(dateInputs.length).toBe(1);
    fireEvent.change(dateInputs[0], { target: { value: "2025-06-15T12:00" } });
    expect(onChange).toHaveBeenCalled();
  });

  it("should handle empty value", () => {
    render(<DateTimeInput value="" onChange={vi.fn()} />);
    // Should render in raw mode without errors
    expect(screen.getByRole("textbox")).toBeDefined();
  });

  it("returns empty string for empty datetime-local value", () => {
    const onChange = vi.fn();
    render(<DateTimeInput value="2025-01-15T10:00:00.000Z" onChange={onChange} />);
    // Switch to date picker
    fireEvent.click(screen.getByLabelText("Switch to date picker"));
    const dateInputs = document.querySelectorAll("input[type='datetime-local']");
    fireEvent.change(dateInputs[0], { target: { value: "" } });
    expect(onChange).toHaveBeenCalledWith("");
  });

  it("converts valid datetime-local value to ISO string", () => {
    const onChange = vi.fn();
    render(<DateTimeInput value="" onChange={onChange} />);
    // Switch to date picker
    fireEvent.click(screen.getByLabelText("Switch to date picker"));
    const dateInputs = document.querySelectorAll("input[type='datetime-local']");
    fireEvent.change(dateInputs[0], { target: { value: "2025-03-15T14:30" } });
    expect(onChange).toHaveBeenCalled();
    const result = onChange.mock.calls[0][0];
    expect(result).toContain("2025");
    expect(result).toContain("T");
  });
});
