import { describe, it, expect } from "vitest";
import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createCompositePresetEditor } from "./CompositePresetViewer.js";

describe("createCompositePresetEditor", () => {
  it("renders composite label with type and condition count (plural)", () => {
    const conditions = [
      { type: "string", key: "region", op: "eq", value: "us" },
      { type: "string", key: "tier", op: "eq", value: "free" },
    ];
    const Editor = createCompositePresetEditor("us_free", "and", conditions);
    render(<Editor condition={{ type: "us_free" }} onChange={() => {}} />);
    expect(screen.getByText(/AND/)).toBeDefined();
    expect(screen.getByText(/2 conditions/)).toBeDefined();
  });

  it("renders condition count as singular for single condition", () => {
    const conditions = [{ type: "string", key: "region", op: "eq", value: "us" }];
    const Editor = createCompositePresetEditor("us_only", "or", conditions);
    render(<Editor condition={{ type: "us_only" }} onChange={() => {}} />);
    expect(screen.getByText(/1 condition\b/)).toBeDefined();
    expect(screen.queryByText(/1 conditions/)).toBeNull();
  });

  it("sets correct displayName on the returned component", () => {
    const Editor = createCompositePresetEditor("my_preset", "and", []);
    expect(Editor.displayName).toBe("CompositePresetEditor(my_preset)");
  });

  it("opens dialog with conditions JSON when Eye button is clicked", async () => {
    const user = userEvent.setup();
    const conditions = [
      { type: "string", key: "region", op: "eq", value: "us" },
      { type: "string", key: "tier", op: "eq", value: "free" },
    ];
    const Editor = createCompositePresetEditor("us_free", "and", conditions);
    render(<Editor condition={{ type: "us_free" }} onChange={() => {}} />);

    const eyeButton = screen.getByRole("button", { name: "View preset conditions" });
    await user.click(eyeButton);

    // Dialog title should be preset name
    expect(screen.getByText("us_free")).toBeDefined();
    // JSON content should be in the pre block — check for a recognizable snippet
    const preEl = document.querySelector("pre");
    expect(preEl).not.toBeNull();
    expect(preEl!.textContent).toContain('"region"');
    expect(preEl!.textContent).toContain('"us"');
  });

  it("closes dialog via the close button", async () => {
    const user = userEvent.setup();
    const conditions = [{ type: "string", key: "tier", op: "eq", value: "pro" }];
    const Editor = createCompositePresetEditor("pro_preset", "and", conditions);
    render(<Editor condition={{ type: "pro_preset" }} onChange={() => {}} />);

    const eyeButton = screen.getByRole("button", { name: "View preset conditions" });
    await user.click(eyeButton);

    // Dialog should be open — title visible
    expect(screen.getByText("pro_preset")).toBeDefined();

    // Click the footer Close button (the visible text "Close" button, not the X icon)
    const closeButtons = screen.getAllByRole("button", { name: "Close" });
    const footerCloseButton = closeButtons.find((btn) => btn.textContent === "Close");
    expect(footerCloseButton).toBeDefined();
    await user.click(footerCloseButton!);

    // Dialog title should no longer be visible
    expect(screen.queryByText("pro_preset")).toBeNull();
  });

  it("displays composite type in uppercase", () => {
    const Editor = createCompositePresetEditor("combo", "or", [
      { type: "bool", key: "active", value: true },
    ]);
    render(<Editor condition={{ type: "combo" }} onChange={() => {}} />);
    expect(screen.getByText(/OR/)).toBeDefined();
  });
});
