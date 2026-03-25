import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { DateTimeInput } from "./DateTimeInput.js";

describe("DateTimeInput", () => {
  it("should render with the given value in raw mode", () => {
    const onChange = vi.fn();
    render(<DateTimeInput value="2025-01-15T10:00:00.000Z" onChange={onChange} />);
    // Switch to raw mode
    fireEvent.click(screen.getByLabelText("Switch to raw input"));
    const input = screen.getByRole("textbox");
    expect((input as HTMLInputElement).value).toBe("2025-01-15T10:00:00.000Z");
  });

  it("should sync rawValue when value prop changes", () => {
    const onChange = vi.fn();
    const { rerender } = render(
      <DateTimeInput value="2025-01-15T10:00:00.000Z" onChange={onChange} />,
    );

    // Switch to raw mode to see the raw value
    fireEvent.click(screen.getByLabelText("Switch to raw input"));
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
    // Switch to raw to verify value is passed through
    fireEvent.click(screen.getByLabelText("Switch to raw input"));
    const input = screen.getByRole("textbox");
    expect((input as HTMLInputElement).value).toBe("not-a-date");
  });

  it("should call onChange when raw input changes", () => {
    const onChange = vi.fn();
    render(<DateTimeInput value="2025-01-15T10:00:00.000Z" onChange={onChange} />);
    fireEvent.click(screen.getByLabelText("Switch to raw input"));
    const input = screen.getByRole("textbox");
    fireEvent.change(input, { target: { value: "2025-12-25T00:00:00.000Z" } });
    expect(onChange).toHaveBeenCalledWith("2025-12-25T00:00:00.000Z");
  });

  it("should switch from raw mode back to date picker", () => {
    const onChange = vi.fn();
    render(<DateTimeInput value="2025-01-15T10:00:00.000Z" onChange={onChange} />);
    // Switch to raw mode
    fireEvent.click(screen.getByLabelText("Switch to raw input"));
    expect(screen.getByRole("textbox")).toBeDefined();
    // Switch back to date picker mode
    fireEvent.click(screen.getByLabelText("Switch to date picker"));
    // Should now show datetime-local input instead of text input
    expect(screen.queryByLabelText("Switch to raw input")).toBeDefined();
  });

  it("should call onChange when datetime-local input changes", () => {
    const onChange = vi.fn();
    render(<DateTimeInput value="2025-01-15T10:00:00.000Z" onChange={onChange} />);
    // Find datetime-local input
    const dateInputs = document.querySelectorAll("input[type='datetime-local']");
    expect(dateInputs.length).toBe(1);
    fireEvent.change(dateInputs[0], { target: { value: "2025-06-15T12:00" } });
    expect(onChange).toHaveBeenCalled();
  });

  it("should handle empty value", () => {
    render(<DateTimeInput value="" onChange={vi.fn()} />);
    // Should render without errors
    expect(screen.getByLabelText("Switch to raw input")).toBeDefined();
  });

  it("returns empty string for invalid date in fromLocalDatetime", () => {
    const onChange = vi.fn();
    render(<DateTimeInput value="2025-01-15T10:00:00.000Z" onChange={onChange} />);
    const dateInputs = document.querySelectorAll("input[type='datetime-local']");
    fireEvent.change(dateInputs[0], { target: { value: "" } });
    expect(onChange).toHaveBeenCalledWith("");
  });
});
