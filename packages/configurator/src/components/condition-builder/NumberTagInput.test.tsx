import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NumberTagInput } from "./NumberTagInput.js";

describe("NumberTagInput", () => {
  it("renders with single number value", () => {
    render(<NumberTagInput value={42} onChange={vi.fn()} />);
    expect(screen.getByText("42")).toBeDefined();
  });

  it("renders with array of numbers", () => {
    render(<NumberTagInput value={[1, 2, 3]} onChange={vi.fn()} />);
    expect(screen.getByText("1")).toBeDefined();
    expect(screen.getByText("2")).toBeDefined();
    expect(screen.getByText("3")).toBeDefined();
  });

  it("adds a number via Enter key", async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<NumberTagInput value={[10]} onChange={onChange} />);
    const input = screen.getByRole("spinbutton");
    await user.type(input, "20{Enter}");
    expect(onChange).toHaveBeenCalledWith([10, 20]);
  });

  it("adds a number via Tab key", async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<NumberTagInput value={[10]} onChange={onChange} />);
    const input = screen.getByRole("spinbutton");
    await user.type(input, "30");
    await user.tab();
    expect(onChange).toHaveBeenCalledWith([10, 30]);
  });

  it("removes a value via badge × button", async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<NumberTagInput value={[1, 2, 3]} onChange={onChange} />);
    await user.click(screen.getByLabelText("Remove 2"));
    expect(onChange).toHaveBeenCalledWith([1, 3]);
  });

  it("removes last value on Backspace when input is empty", async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<NumberTagInput value={[1, 2]} onChange={onChange} />);
    const input = screen.getByRole("spinbutton");
    await user.click(input);
    await user.keyboard("{Backspace}");
    expect(onChange).toHaveBeenCalledWith(1);
  });

  it("handles paste with newline-separated numbers", () => {
    const onChange = vi.fn();
    render(<NumberTagInput value={[1]} onChange={onChange} />);
    const input = screen.getByRole("spinbutton");
    fireEvent.paste(input, {
      clipboardData: { getData: () => "2\n3\n4" },
    });
    expect(onChange).toHaveBeenCalledWith([1, 2, 3, 4]);
  });

  it("ignores NaN values", async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<NumberTagInput value={[1]} onChange={onChange} />);
    const input = screen.getByRole("spinbutton");
    await user.type(input, "abc{Enter}");
    expect(onChange).not.toHaveBeenCalled();
  });

  it("ignores duplicate values", async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<NumberTagInput value={[5]} onChange={onChange} />);
    const input = screen.getByRole("spinbutton");
    await user.type(input, "5{Enter}");
    expect(onChange).not.toHaveBeenCalled();
  });

  it("emits single number when only one value", async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<NumberTagInput value={[] as number[]} onChange={onChange} />);
    const input = screen.getByRole("spinbutton");
    await user.type(input, "99{Enter}");
    expect(onChange).toHaveBeenCalledWith(99);
  });

  it("emits array when multiple values", async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<NumberTagInput value={[10]} onChange={onChange} />);
    const input = screen.getByRole("spinbutton");
    await user.type(input, "20{Enter}");
    expect(onChange).toHaveBeenCalledWith([10, 20]);
  });

  it("shows placeholder when empty", () => {
    render(
      <NumberTagInput value={[] as number[]} onChange={vi.fn()} placeholder="enter numbers" />,
    );
    expect(screen.getByPlaceholderText("enter numbers")).toBeDefined();
  });

  it("shows default placeholder when empty and no placeholder prop", () => {
    render(<NumberTagInput value={[] as number[]} onChange={vi.fn()} />);
    expect(screen.getByPlaceholderText("type and press Enter")).toBeDefined();
  });

  it("shows no placeholder when values exist", () => {
    render(<NumberTagInput value={[1]} onChange={vi.fn()} placeholder="enter numbers" />);
    const input = screen.getByRole("spinbutton");
    expect(input.getAttribute("placeholder")).toBe("");
  });

  it("does not handle paste without newlines", () => {
    const onChange = vi.fn();
    render(<NumberTagInput value={[1]} onChange={onChange} />);
    const input = screen.getByRole("spinbutton");
    fireEvent.paste(input, {
      clipboardData: { getData: () => "42" },
    });
    expect(onChange).not.toHaveBeenCalled();
  });

  it("emits empty array when last tag is removed", async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<NumberTagInput value={5} onChange={onChange} />);
    await user.click(screen.getByLabelText("Remove 5"));
    expect(onChange).toHaveBeenCalledWith([]);
  });

  it("filters empty lines and whitespace from paste", () => {
    const onChange = vi.fn();
    render(<NumberTagInput value={[1]} onChange={onChange} />);
    const input = screen.getByRole("spinbutton");
    fireEvent.paste(input, {
      clipboardData: { getData: () => "2\n \n\n3" },
    });
    expect(onChange).toHaveBeenCalledWith([1, 2, 3]);
  });
});
