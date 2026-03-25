import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "./tabs.js";

describe("Tabs components", () => {
  it("renders the default tab content", () => {
    render(
      <Tabs defaultValue="one">
        <TabsList>
          <TabsTrigger value="one">Tab One</TabsTrigger>
          <TabsTrigger value="two">Tab Two</TabsTrigger>
        </TabsList>
        <TabsContent value="one">Content One</TabsContent>
        <TabsContent value="two">Content Two</TabsContent>
      </Tabs>,
    );
    expect(screen.getByText("Content One")).toBeDefined();
    expect(screen.getByText("Tab One")).toBeDefined();
    expect(screen.getByText("Tab Two")).toBeDefined();
  });

  it("switches content when a tab trigger is clicked", async () => {
    const user = userEvent.setup();
    render(
      <Tabs defaultValue="one">
        <TabsList>
          <TabsTrigger value="one">Tab One</TabsTrigger>
          <TabsTrigger value="two">Tab Two</TabsTrigger>
        </TabsList>
        <TabsContent value="one">Content One</TabsContent>
        <TabsContent value="two">Content Two</TabsContent>
      </Tabs>,
    );
    await user.click(screen.getByText("Tab Two"));
    expect(screen.getByText("Content Two")).toBeDefined();
  });

  it("supports vertical orientation", () => {
    render(
      <Tabs defaultValue="a" orientation="vertical">
        <TabsList>
          <TabsTrigger value="a">A</TabsTrigger>
          <TabsTrigger value="b">B</TabsTrigger>
        </TabsList>
        <TabsContent value="a">Content A</TabsContent>
      </Tabs>,
    );
    const list = screen.getByRole("tablist");
    expect(list.getAttribute("aria-orientation")).toBe("vertical");
  });

  it("defaults to horizontal orientation", () => {
    render(
      <Tabs defaultValue="a">
        <TabsList>
          <TabsTrigger value="a">A</TabsTrigger>
        </TabsList>
        <TabsContent value="a">Content A</TabsContent>
      </Tabs>,
    );
    const list = screen.getByRole("tablist");
    expect(list.getAttribute("aria-orientation")).toBe("horizontal");
  });

  it("passes custom className to TabsList", () => {
    render(
      <Tabs defaultValue="a">
        <TabsList className="custom-list">
          <TabsTrigger value="a">A</TabsTrigger>
        </TabsList>
        <TabsContent value="a">Content A</TabsContent>
      </Tabs>,
    );
    const list = screen.getByRole("tablist");
    expect(list.className).toContain("custom-list");
  });

  it("passes custom className to TabsTrigger", () => {
    render(
      <Tabs defaultValue="a">
        <TabsList>
          <TabsTrigger value="a" className="custom-trigger">
            A
          </TabsTrigger>
        </TabsList>
        <TabsContent value="a">Content A</TabsContent>
      </Tabs>,
    );
    const trigger = screen.getByRole("tab");
    expect(trigger.className).toContain("custom-trigger");
  });

  it("passes custom className to TabsContent", () => {
    render(
      <Tabs defaultValue="a">
        <TabsList>
          <TabsTrigger value="a">A</TabsTrigger>
        </TabsList>
        <TabsContent value="a" className="custom-content">
          Content A
        </TabsContent>
      </Tabs>,
    );
    const panel = screen.getByRole("tabpanel");
    expect(panel.className).toContain("custom-content");
  });

  it("navigates with keyboard arrow keys in horizontal mode", async () => {
    const user = userEvent.setup();
    render(
      <Tabs defaultValue="one">
        <TabsList>
          <TabsTrigger value="one">Tab One</TabsTrigger>
          <TabsTrigger value="two">Tab Two</TabsTrigger>
        </TabsList>
        <TabsContent value="one">Content One</TabsContent>
        <TabsContent value="two">Content Two</TabsContent>
      </Tabs>,
    );
    screen.getByText("Tab One").focus();
    await user.keyboard("{ArrowRight}");
    expect(document.activeElement?.textContent).toBe("Tab Two");
  });

  it("navigates with keyboard arrow keys in vertical mode", async () => {
    const user = userEvent.setup();
    render(
      <Tabs defaultValue="one" orientation="vertical">
        <TabsList>
          <TabsTrigger value="one">Tab One</TabsTrigger>
          <TabsTrigger value="two">Tab Two</TabsTrigger>
        </TabsList>
        <TabsContent value="one">Content One</TabsContent>
        <TabsContent value="two">Content Two</TabsContent>
      </Tabs>,
    );
    screen.getByText("Tab One").focus();
    await user.keyboard("{ArrowDown}");
    expect(document.activeElement?.textContent).toBe("Tab Two");
  });
});
