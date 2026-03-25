import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
  SelectScrollUpButton,
  SelectScrollDownButton,
} from "./select.js";

describe("Select components", () => {
  it("renders Select with trigger and combobox role", () => {
    render(
      <Select value="one">
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="one">One</SelectItem>
          <SelectItem value="two">Two</SelectItem>
        </SelectContent>
      </Select>,
    );
    expect(screen.getByRole("combobox")).toBeDefined();
  });

  it("renders SelectTrigger with default size", () => {
    render(
      <Select value="one">
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="one">One</SelectItem>
        </SelectContent>
      </Select>,
    );
    const trigger = screen.getByRole("combobox");
    expect(trigger.getAttribute("data-size")).toBe("default");
  });

  it("renders SelectTrigger with sm size", () => {
    render(
      <Select value="one">
        <SelectTrigger size="sm">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="one">One</SelectItem>
        </SelectContent>
      </Select>,
    );
    const trigger = screen.getByRole("combobox");
    expect(trigger.getAttribute("data-size")).toBe("sm");
  });

  it("opens and shows items when trigger is clicked", async () => {
    const user = userEvent.setup();
    render(
      <Select value="one">
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="one">One</SelectItem>
          <SelectItem value="two">Two</SelectItem>
        </SelectContent>
      </Select>,
    );
    await user.click(screen.getByRole("combobox"));
    expect(screen.getByText("Two")).toBeDefined();
  });

  it("renders SelectGroup and SelectLabel", async () => {
    const user = userEvent.setup();
    render(
      <Select value="one">
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            <SelectLabel>Group label</SelectLabel>
            <SelectItem value="one">One</SelectItem>
          </SelectGroup>
        </SelectContent>
      </Select>,
    );
    await user.click(screen.getByRole("combobox"));
    expect(screen.getByText("Group label")).toBeDefined();
  });

  it("renders SelectSeparator", async () => {
    const user = userEvent.setup();
    render(
      <Select value="one">
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="one">One</SelectItem>
          <SelectSeparator />
          <SelectItem value="two">Two</SelectItem>
        </SelectContent>
      </Select>,
    );
    await user.click(screen.getByRole("combobox"));
    // SelectSeparator renders with data-slot
    expect(document.querySelector("[data-slot='select-separator']")).toBeDefined();
  });

  it("calls onValueChange when item is selected", async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(
      <Select value="one" onValueChange={onChange}>
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="one">One</SelectItem>
          <SelectItem value="two">Two</SelectItem>
        </SelectContent>
      </Select>,
    );
    await user.click(screen.getByRole("combobox"));
    await user.click(screen.getByText("Two"));
    expect(onChange).toHaveBeenCalledWith("two");
  });

  it("exports SelectScrollUpButton and SelectScrollDownButton", () => {
    expect(SelectScrollUpButton).toBeDefined();
    expect(SelectScrollDownButton).toBeDefined();
  });

  it("renders SelectContent with popper position", async () => {
    const user = userEvent.setup();
    render(
      <Select value="one">
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent position="popper">
          <SelectItem value="one">One</SelectItem>
          <SelectItem value="two">Two</SelectItem>
        </SelectContent>
      </Select>,
    );
    await user.click(screen.getByRole("combobox"));
    expect(screen.getByText("Two")).toBeDefined();
  });

  it("passes custom className to SelectLabel", async () => {
    const user = userEvent.setup();
    render(
      <Select value="one">
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            <SelectLabel className="my-label-class">Custom Label</SelectLabel>
            <SelectItem value="one">One</SelectItem>
          </SelectGroup>
        </SelectContent>
      </Select>,
    );
    await user.click(screen.getByRole("combobox"));
    expect(screen.getByText("Custom Label").className).toContain("my-label-class");
  });
});
