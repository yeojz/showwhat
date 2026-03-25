import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TagInput } from "./TagInput.js";

describe("TagInput", () => {
  it("renders tags from array value", () => {
    render(<TagInput value={["a", "b"]} onChange={vi.fn()} />);
    expect(screen.getByText("a")).toBeDefined();
    expect(screen.getByText("b")).toBeDefined();
  });

  it("renders single string value as tag", () => {
    render(<TagInput value="hello" onChange={vi.fn()} />);
    expect(screen.getByText("hello")).toBeDefined();
  });

  it("renders empty state with placeholder", () => {
    render(<TagInput value="" onChange={vi.fn()} placeholder="type here" />);
    expect(screen.getByPlaceholderText("type here")).toBeDefined();
  });

  it("adds a tag on Enter", async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<TagInput value={["a"]} onChange={onChange} />);
    const input = screen.getByRole("textbox");
    await user.type(input, "b{Enter}");
    expect(onChange).toHaveBeenCalledWith(["a", "b"]);
  });

  it("adds a tag on Tab", async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<TagInput value={["a"]} onChange={onChange} />);
    const input = screen.getByRole("textbox");
    await user.type(input, "c");
    await user.tab();
    expect(onChange).toHaveBeenCalledWith(["a", "c"]);
  });

  it("removes last tag on Backspace when input is empty", async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<TagInput value={["a", "b"]} onChange={onChange} />);
    const input = screen.getByRole("textbox");
    await user.click(input);
    await user.keyboard("{Backspace}");
    expect(onChange).toHaveBeenCalledWith("a");
  });

  it("removes specific tag when x button is clicked", async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<TagInput value={["a", "b"]} onChange={onChange} />);
    await user.click(screen.getByLabelText("Remove a"));
    expect(onChange).toHaveBeenCalledWith("b");
  });

  it("does not add duplicate values", async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<TagInput value={["a"]} onChange={onChange} />);
    const input = screen.getByRole("textbox");
    await user.type(input, "a{Enter}");
    expect(onChange).not.toHaveBeenCalled();
  });

  it("handles paste with newlines", async () => {
    const onChange = vi.fn();
    render(<TagInput value={["a"]} onChange={onChange} />);
    const input = screen.getByRole("textbox");
    fireEvent.paste(input, {
      clipboardData: { getData: () => "b\nc\nd" },
    });
    expect(onChange).toHaveBeenCalledWith(["a", "b", "c", "d"]);
  });

  it("emits single string when result has only one value", async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<TagInput value="" onChange={onChange} />);
    const input = screen.getByRole("textbox");
    await user.type(input, "single{Enter}");
    expect(onChange).toHaveBeenCalledWith("single");
  });

  it("emits empty array when last tag is removed", async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<TagInput value="only" onChange={onChange} />);
    await user.click(screen.getByLabelText("Remove only"));
    expect(onChange).toHaveBeenCalledWith([]);
  });

  it("filters empty strings from array value", () => {
    render(<TagInput value={["a", "", "b"]} onChange={vi.fn()} />);
    expect(screen.getByText("a")).toBeDefined();
    expect(screen.getByText("b")).toBeDefined();
  });

  it("does not paste handle when paste has no newlines", () => {
    const onChange = vi.fn();
    render(<TagInput value="" onChange={onChange} />);
    const input = screen.getByRole("textbox");
    fireEvent.paste(input, {
      clipboardData: { getData: () => "no-newline" },
    });
    // Should not call onChange because it only handles paste with newlines
    expect(onChange).not.toHaveBeenCalled();
  });
});
