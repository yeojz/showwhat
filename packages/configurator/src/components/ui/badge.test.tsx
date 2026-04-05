import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Badge } from "./badge.js";

describe("Badge", () => {
  it("renders as a span by default", () => {
    render(<Badge>Default</Badge>);
    const el = screen.getByText("Default");
    expect(el.tagName).toBe("SPAN");
  });

  it("renders with the default variant data attribute", () => {
    render(<Badge>Default</Badge>);
    const el = screen.getByText("Default");
    expect(el.getAttribute("data-variant")).toBe("default");
  });

  it("renders with a custom variant", () => {
    render(<Badge variant="destructive">Error</Badge>);
    const el = screen.getByText("Error");
    expect(el.getAttribute("data-variant")).toBe("destructive");
  });

  it("merges custom className", () => {
    render(<Badge className="custom-class">Styled</Badge>);
    const el = screen.getByText("Styled");
    expect(el.className).toContain("custom-class");
  });
});
