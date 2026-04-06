import { describe, it, expect } from "vitest";
import { render, screen, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Tabs, TabsList, TabsTab, TabsPanel } from "./tabs.js";

describe("Tabs components", () => {
  it("renders the default tab content", () => {
    render(
      <Tabs defaultValue="one">
        <TabsList>
          <TabsTab value="one">Tab One</TabsTab>
          <TabsTab value="two">Tab Two</TabsTab>
        </TabsList>
        <TabsPanel value="one">Content One</TabsPanel>
        <TabsPanel value="two">Content Two</TabsPanel>
      </Tabs>,
    );
    expect(screen.getByText("Content One")).toBeDefined();
    expect(screen.getByText("Tab One")).toBeDefined();
    expect(screen.getByText("Tab Two")).toBeDefined();
  });

  it("switches content when a tab is clicked", async () => {
    const user = userEvent.setup();
    render(
      <Tabs defaultValue="one">
        <TabsList>
          <TabsTab value="one">Tab One</TabsTab>
          <TabsTab value="two">Tab Two</TabsTab>
        </TabsList>
        <TabsPanel value="one">Content One</TabsPanel>
        <TabsPanel value="two">Content Two</TabsPanel>
      </Tabs>,
    );
    await user.click(screen.getByText("Tab Two"));
    expect(screen.getByText("Content Two")).toBeDefined();
  });

  it("supports vertical orientation", () => {
    render(
      <Tabs defaultValue="a" orientation="vertical">
        <TabsList>
          <TabsTab value="a">A</TabsTab>
          <TabsTab value="b">B</TabsTab>
        </TabsList>
        <TabsPanel value="a">Content A</TabsPanel>
      </Tabs>,
    );
    const list = screen.getByRole("tablist");
    expect(list.getAttribute("aria-orientation")).toBe("vertical");
  });

  it("defaults to horizontal orientation", () => {
    render(
      <Tabs defaultValue="a">
        <TabsList>
          <TabsTab value="a">A</TabsTab>
        </TabsList>
        <TabsPanel value="a">Content A</TabsPanel>
      </Tabs>,
    );
    const list = screen.getByRole("tablist");
    // Base UI omits aria-orientation for horizontal (the default)
    expect(list.getAttribute("aria-orientation")).toBeNull();
  });

  it("passes custom className to TabsList", () => {
    render(
      <Tabs defaultValue="a">
        <TabsList className="custom-list">
          <TabsTab value="a">A</TabsTab>
        </TabsList>
        <TabsPanel value="a">Content A</TabsPanel>
      </Tabs>,
    );
    const list = screen.getByRole("tablist");
    expect(list.className).toContain("custom-list");
  });

  it("passes custom className to TabsTab", () => {
    render(
      <Tabs defaultValue="a">
        <TabsList>
          <TabsTab value="a" className="custom-trigger">
            A
          </TabsTab>
        </TabsList>
        <TabsPanel value="a">Content A</TabsPanel>
      </Tabs>,
    );
    const trigger = screen.getByRole("tab");
    expect(trigger.className).toContain("custom-trigger");
  });

  it("passes custom className to TabsPanel", () => {
    render(
      <Tabs defaultValue="a">
        <TabsList>
          <TabsTab value="a">A</TabsTab>
        </TabsList>
        <TabsPanel value="a" className="custom-content">
          Content A
        </TabsPanel>
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
          <TabsTab value="one">Tab One</TabsTab>
          <TabsTab value="two">Tab Two</TabsTab>
        </TabsList>
        <TabsPanel value="one">Content One</TabsPanel>
        <TabsPanel value="two">Content Two</TabsPanel>
      </Tabs>,
    );
    await act(async () => {
      screen.getByText("Tab One").focus();
    });
    await user.keyboard("{ArrowRight}");
    expect(document.activeElement?.textContent).toBe("Tab Two");
  });

  it("navigates with keyboard arrow keys in vertical mode", async () => {
    const user = userEvent.setup();
    render(
      <Tabs defaultValue="one" orientation="vertical">
        <TabsList>
          <TabsTab value="one">Tab One</TabsTab>
          <TabsTab value="two">Tab Two</TabsTab>
        </TabsList>
        <TabsPanel value="one">Content One</TabsPanel>
        <TabsPanel value="two">Content Two</TabsPanel>
      </Tabs>,
    );
    await act(async () => {
      screen.getByText("Tab One").focus();
    });
    await user.keyboard("{ArrowDown}");
    expect(document.activeElement?.textContent).toBe("Tab Two");
  });
});
