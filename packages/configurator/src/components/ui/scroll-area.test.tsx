import { describe, it, expect, vi } from "vitest";
import { render } from "@testing-library/react";
import { ScrollArea, ScrollBar } from "./scroll-area.js";

// Mock @base-ui/react scroll area primitives so ScrollBar renders real DOM in jsdom
vi.mock("@base-ui/react/scroll-area", async (importOriginal) => {
  const actual = (await importOriginal()) as Record<string, unknown>;
  return {
    ...actual,
    ScrollArea: {
      Root: ({ children, ...props }: React.ComponentProps<"div">) => (
        <div data-base-ui-scroll-area-root="" {...props}>
          {children}
        </div>
      ),
      Viewport: ({ children, ...props }: React.ComponentProps<"div">) => (
        <div data-base-ui-scroll-area-viewport="" {...props}>
          {children}
        </div>
      ),
      Content: ({ children, ...props }: React.ComponentProps<"div">) => (
        <div {...props}>{children}</div>
      ),
      Scrollbar: ({
        children,
        orientation,
        ...props
      }: React.ComponentProps<"div"> & { orientation?: string }) => (
        <div data-orientation={orientation} {...props}>
          {children}
        </div>
      ),
      Thumb: (props: React.ComponentProps<"div">) => <div {...props} />,
      Corner: (props: React.ComponentProps<"div">) => <div {...props} />,
    },
  };
});

describe("ScrollArea", () => {
  it("renders with data-slot attribute", () => {
    const { container } = render(
      <ScrollArea>
        <p>Content</p>
      </ScrollArea>,
    );
    expect(container.querySelector("[data-slot='scroll-area']")).not.toBeNull();
  });

  it("merges custom className", () => {
    const { container } = render(
      <ScrollArea className="custom-class">
        <p>Content</p>
      </ScrollArea>,
    );
    const el = container.querySelector("[data-slot='scroll-area']")!;
    expect(el.className).toContain("custom-class");
  });
});

describe("ScrollBar", () => {
  it("renders vertical scrollbar by default with correct classes", () => {
    const { container } = render(
      <ScrollArea>
        <ScrollBar />
      </ScrollArea>,
    );
    const scrollbars = container.querySelectorAll("[data-slot='scroll-area-scrollbar']");
    const vertical = Array.from(scrollbars).filter(
      (el) => el.getAttribute("data-orientation") === "vertical",
    );
    expect(vertical.length).toBeGreaterThan(0);
    expect(vertical[0].className).toContain("h-full");
  });

  it("renders horizontal scrollbar with correct classes", () => {
    const { container } = render(
      <ScrollArea>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>,
    );
    const scrollbars = container.querySelectorAll("[data-slot='scroll-area-scrollbar']");
    const horizontal = Array.from(scrollbars).filter(
      (el) => el.getAttribute("data-orientation") === "horizontal",
    );
    expect(horizontal.length).toBeGreaterThan(0);
    expect(horizontal[0].className).toContain("flex-col");
  });
});
