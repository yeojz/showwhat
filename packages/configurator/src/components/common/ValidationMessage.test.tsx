import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { ValidationMessage } from "./ValidationMessage.js";
import type { ValidationIssueDisplay } from "../../types.js";

describe("ValidationMessage", () => {
  it("should render nothing when errors is undefined", () => {
    const { container } = render(<ValidationMessage errors={undefined} />);
    expect(container.innerHTML).toBe("");
  });

  it("should render nothing when errors is an empty array", () => {
    const { container } = render(<ValidationMessage errors={[]} />);
    expect(container.innerHTML).toBe("");
  });

  it("should render error messages", () => {
    const errors: ValidationIssueDisplay[] = [
      { path: [], message: "Value is required" },
      { path: [], message: "Must be a string" },
    ];
    render(<ValidationMessage errors={errors} />);
    expect(screen.getByText("Value is required")).toBeDefined();
    expect(screen.getByText("Must be a string")).toBeDefined();
  });

  it("should render the path prefix when path is non-empty", () => {
    const errors: ValidationIssueDisplay[] = [
      { path: ["conditions", 0, "value"], message: "Invalid condition value" },
    ];
    render(<ValidationMessage errors={errors} />);
    expect(screen.getByText("conditions.0.value")).toBeDefined();
    expect(screen.getByText("Invalid condition value")).toBeDefined();
  });

  it("should not render path prefix when path is empty", () => {
    const errors: ValidationIssueDisplay[] = [{ path: [], message: "Top-level error" }];
    render(<ValidationMessage errors={errors} />);
    expect(screen.getByText("Top-level error")).toBeDefined();
    // No font-mono span should be rendered for empty path
    const container = document.querySelector(".space-y-1");
    const monoSpan = container?.querySelector(".font-mono");
    expect(monoSpan).toBeNull();
  });

  it("should render multiple errors each with their own path", () => {
    const errors: ValidationIssueDisplay[] = [
      { path: ["value"], message: "Required" },
      { path: ["description"], message: "Too long" },
      { path: [], message: "General error" },
    ];
    render(<ValidationMessage errors={errors} />);
    expect(screen.getByText("value")).toBeDefined();
    expect(screen.getByText("Required")).toBeDefined();
    expect(screen.getByText("description")).toBeDefined();
    expect(screen.getByText("Too long")).toBeDefined();
    expect(screen.getByText("General error")).toBeDefined();
  });
});
