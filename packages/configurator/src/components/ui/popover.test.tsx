import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
  PopoverAnchor,
  PopoverHeader,
  PopoverTitle,
  PopoverDescription,
} from "./popover.js";

describe("Popover components", () => {
  it("renders Popover with trigger", () => {
    render(
      <Popover>
        <PopoverTrigger>Open popover</PopoverTrigger>
        <PopoverContent>Popover content</PopoverContent>
      </Popover>,
    );
    expect(screen.getByText("Open popover")).toBeDefined();
  });

  it("opens popover content when trigger is clicked", async () => {
    const user = userEvent.setup();
    render(
      <Popover>
        <PopoverTrigger>Open popover</PopoverTrigger>
        <PopoverContent>Popover content here</PopoverContent>
      </Popover>,
    );
    await user.click(screen.getByText("Open popover"));
    expect(screen.getByText("Popover content here")).toBeDefined();
  });

  it("renders PopoverAnchor", () => {
    render(
      <Popover>
        <PopoverAnchor>
          <span>Anchor element</span>
        </PopoverAnchor>
        <PopoverTrigger>Open</PopoverTrigger>
        <PopoverContent>Content</PopoverContent>
      </Popover>,
    );
    expect(screen.getByText("Anchor element")).toBeDefined();
  });

  it("renders PopoverHeader, PopoverTitle, and PopoverDescription", async () => {
    const user = userEvent.setup();
    render(
      <Popover>
        <PopoverTrigger>Open</PopoverTrigger>
        <PopoverContent>
          <PopoverHeader>
            <PopoverTitle>Title text</PopoverTitle>
            <PopoverDescription>Description text</PopoverDescription>
          </PopoverHeader>
        </PopoverContent>
      </Popover>,
    );
    await user.click(screen.getByText("Open"));
    expect(screen.getByText("Title text")).toBeDefined();
    expect(screen.getByText("Description text")).toBeDefined();
  });

  it("passes custom className to PopoverContent", async () => {
    const user = userEvent.setup();
    render(
      <Popover>
        <PopoverTrigger>Open</PopoverTrigger>
        <PopoverContent className="my-custom-class">Content</PopoverContent>
      </Popover>,
    );
    await user.click(screen.getByText("Open"));
    const content = screen.getByText("Content");
    expect(content.closest("[data-slot='popover-content']")?.className).toContain(
      "my-custom-class",
    );
  });

  it("passes custom className to PopoverHeader", async () => {
    const user = userEvent.setup();
    render(
      <Popover>
        <PopoverTrigger>Open</PopoverTrigger>
        <PopoverContent>
          <PopoverHeader className="header-class">Header</PopoverHeader>
        </PopoverContent>
      </Popover>,
    );
    await user.click(screen.getByText("Open"));
    const header = screen.getByText("Header");
    expect(header.className).toContain("header-class");
  });

  it("passes custom className to PopoverTitle", async () => {
    const user = userEvent.setup();
    render(
      <Popover>
        <PopoverTrigger>Open</PopoverTrigger>
        <PopoverContent>
          <PopoverTitle className="title-class">Title</PopoverTitle>
        </PopoverContent>
      </Popover>,
    );
    await user.click(screen.getByText("Open"));
    const title = screen.getByText("Title");
    expect(title.className).toContain("title-class");
  });

  it("passes custom className to PopoverDescription", async () => {
    const user = userEvent.setup();
    render(
      <Popover>
        <PopoverTrigger>Open</PopoverTrigger>
        <PopoverContent>
          <PopoverDescription className="desc-class">Desc</PopoverDescription>
        </PopoverContent>
      </Popover>,
    );
    await user.click(screen.getByText("Open"));
    const desc = screen.getByText("Desc");
    expect(desc.className).toContain("desc-class");
  });
});
