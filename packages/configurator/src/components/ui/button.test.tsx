import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Button } from "./button.js";

describe("Button", () => {
  it("renders as a button by default", () => {
    render(<Button>Click me</Button>);
    const el = screen.getByText("Click me");
    expect(el.tagName).toBe("BUTTON");
  });

  it("renders with default variant and size data attributes", () => {
    render(<Button>Default</Button>);
    const el = screen.getByText("Default");
    expect(el.getAttribute("data-variant")).toBe("default");
    expect(el.getAttribute("data-size")).toBe("default");
  });

  it("renders with a custom variant", () => {
    render(<Button variant="destructive">Delete</Button>);
    const el = screen.getByText("Delete");
    expect(el.getAttribute("data-variant")).toBe("destructive");
  });

  it("merges custom className", () => {
    render(<Button className="custom-class">Styled</Button>);
    const el = screen.getByText("Styled");
    expect(el.className).toContain("custom-class");
  });

  it("renders as child element when asChild is true", () => {
    render(
      <Button asChild>
        <a href="/test">Link Button</a>
      </Button>,
    );
    const el = screen.getByText("Link Button");
    expect(el.tagName).toBe("A");
  });
});
