import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DefinitionListItem } from "./DefinitionListItem.js";

describe("DefinitionListItem", () => {
  const baseProps = {
    definitionKey: "my-flag",
    variationCount: 3,
    isActive: true,
    hasErrors: false,
    isSelected: false,
    onSelect: vi.fn(),
    onRemove: vi.fn(),
  };

  it("renders the definition key and variation count", () => {
    render(<DefinitionListItem {...baseProps} />);
    expect(screen.getByText("my-flag")).toBeDefined();
    expect(screen.getByText("3")).toBeDefined();
  });

  it("calls onSelect when clicked", () => {
    const onSelect = vi.fn();
    render(<DefinitionListItem {...baseProps} onSelect={onSelect} />);
    fireEvent.click(screen.getByText("my-flag"));
    expect(onSelect).toHaveBeenCalledOnce();
  });

  it("calls onSelect when Enter key is pressed", () => {
    const onSelect = vi.fn();
    render(<DefinitionListItem {...baseProps} onSelect={onSelect} />);
    const item = screen.getByText("my-flag").closest("[tabindex]")!;
    fireEvent.keyDown(item, { key: "Enter" });
    expect(onSelect).toHaveBeenCalledOnce();
  });

  it("calls onSelect when Space key is pressed", () => {
    const onSelect = vi.fn();
    render(<DefinitionListItem {...baseProps} onSelect={onSelect} />);
    const item = screen.getByText("my-flag").closest("[tabindex]")!;
    fireEvent.keyDown(item, { key: " " });
    expect(onSelect).toHaveBeenCalledOnce();
  });

  it("does not call onSelect for other keys", () => {
    const onSelect = vi.fn();
    render(<DefinitionListItem {...baseProps} onSelect={onSelect} />);
    const item = screen.getByText("my-flag").closest("[tabindex]")!;
    fireEvent.keyDown(item, { key: "Tab" });
    expect(onSelect).not.toHaveBeenCalled();
  });

  it("shows active status indicator", () => {
    render(<DefinitionListItem {...baseProps} isActive={true} hasErrors={false} />);
    const status = screen.getByRole("status");
    expect(status.getAttribute("aria-label")).toContain("active");
  });

  it("shows inactive status indicator", () => {
    render(<DefinitionListItem {...baseProps} isActive={false} hasErrors={false} />);
    const status = screen.getByRole("status");
    expect(status.getAttribute("aria-label")).toContain("inactive");
  });

  it("shows error status indicator", () => {
    render(<DefinitionListItem {...baseProps} hasErrors={true} />);
    const status = screen.getByRole("status");
    expect(status.getAttribute("aria-label")).toContain("error");
  });

  it("shows unsaved changes in status indicator when dirty", () => {
    render(<DefinitionListItem {...baseProps} isDirty={true} />);
    const status = screen.getByRole("status");
    expect(status.getAttribute("aria-label")).toContain("unsaved changes");
  });

  it("renders selected state with different styling", () => {
    render(<DefinitionListItem {...baseProps} isSelected={true} />);
    const item = screen.getByText("my-flag").closest("[tabindex]")!;
    expect(item.className).toContain("border-l-primary");
  });

  it("opens confirm dialog and calls onRemove on confirm", async () => {
    const user = userEvent.setup();
    const onRemove = vi.fn();
    render(<DefinitionListItem {...baseProps} onRemove={onRemove} />);
    const removeButton = screen.getByLabelText("Remove my-flag");
    await user.click(removeButton);
    // Confirm dialog should appear
    const confirmButton = await screen.findByRole("button", { name: "Delete" });
    await user.click(confirmButton);
    expect(onRemove).toHaveBeenCalledOnce();
  });

  it("stops propagation when remove button is clicked", () => {
    const onSelect = vi.fn();
    render(<DefinitionListItem {...baseProps} onSelect={onSelect} />);
    const removeButton = screen.getByLabelText("Remove my-flag");
    fireEvent.click(removeButton);
    // onSelect should NOT have been called because stopPropagation was called
    expect(onSelect).not.toHaveBeenCalled();
  });

  it("shows dirty + error state", () => {
    render(<DefinitionListItem {...baseProps} hasErrors={true} isDirty={true} />);
    const status = screen.getByRole("status");
    expect(status.getAttribute("aria-label")).toContain("error");
    expect(status.getAttribute("aria-label")).toContain("unsaved changes");
  });

  it("shows dirty + active state", () => {
    render(<DefinitionListItem {...baseProps} isActive={true} isDirty={true} />);
    const status = screen.getByRole("status");
    expect(status.getAttribute("aria-label")).toContain("active");
    expect(status.getAttribute("aria-label")).toContain("unsaved changes");
  });

  it("shows dirty + inactive state", () => {
    render(<DefinitionListItem {...baseProps} isActive={false} isDirty={true} />);
    const status = screen.getByRole("status");
    expect(status.getAttribute("aria-label")).toContain("inactive");
    expect(status.getAttribute("aria-label")).toContain("unsaved changes");
  });
});
