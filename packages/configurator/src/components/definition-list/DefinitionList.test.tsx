import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { DefinitionList } from "./DefinitionList.js";
import type { Definitions } from "showwhat";

const testDefinitions: Definitions = {
  "feature-a": { variations: [{ value: true }, { value: false }] },
  "feature-b": { variations: [{ value: "hello" }] },
  "feature-c": { description: "test", variations: [{ value: 1 }] },
};

describe("DefinitionList", () => {
  it("should render all definition keys", () => {
    render(
      <DefinitionList
        keys={Object.keys(testDefinitions)}
        definitions={testDefinitions}
        selectedKey={null}
        onSelect={vi.fn()}
        onAdd={vi.fn()}
        onRemove={vi.fn()}
      />,
    );
    expect(screen.getByText("feature-a")).toBeDefined();
    expect(screen.getByText("feature-b")).toBeDefined();
    expect(screen.getByText("feature-c")).toBeDefined();
  });

  it("should filter definitions by search", () => {
    render(
      <DefinitionList
        keys={Object.keys(testDefinitions)}
        definitions={testDefinitions}
        selectedKey={null}
        onSelect={vi.fn()}
        onAdd={vi.fn()}
        onRemove={vi.fn()}
      />,
    );
    const searchInput = screen.getByPlaceholderText("Search definitions...");
    fireEvent.change(searchInput, { target: { value: "feature-b" } });
    expect(screen.queryByText("feature-a")).toBeNull();
    expect(screen.getByText("feature-b")).toBeDefined();
  });

  it("should call onSelect when clicking a definition", () => {
    const onSelect = vi.fn();
    render(
      <DefinitionList
        keys={Object.keys(testDefinitions)}
        definitions={testDefinitions}
        selectedKey={null}
        onSelect={onSelect}
        onAdd={vi.fn()}
        onRemove={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByText("feature-a"));
    expect(onSelect).toHaveBeenCalledWith("feature-a");
  });

  it("should show variation count badges", () => {
    render(
      <DefinitionList
        keys={Object.keys(testDefinitions)}
        definitions={testDefinitions}
        selectedKey={null}
        onSelect={vi.fn()}
        onAdd={vi.fn()}
        onRemove={vi.fn()}
      />,
    );
    // feature-a has 2 variations
    expect(screen.getByText("2")).toBeDefined();
  });

  it("should show empty state when no definitions match search", () => {
    render(
      <DefinitionList
        keys={Object.keys(testDefinitions)}
        definitions={testDefinitions}
        selectedKey={null}
        onSelect={vi.fn()}
        onAdd={vi.fn()}
        onRemove={vi.fn()}
      />,
    );
    const searchInput = screen.getByPlaceholderText("Search definitions...");
    fireEvent.change(searchInput, { target: { value: "nonexistent" } });
    expect(screen.getByText("No definitions match")).toBeDefined();
  });

  it("should show empty state when there are no definitions", () => {
    render(
      <DefinitionList
        keys={[]}
        definitions={{}}
        selectedKey={null}
        onSelect={vi.fn()}
        onAdd={vi.fn()}
        onRemove={vi.fn()}
      />,
    );
    expect(screen.getByText("No definitions")).toBeDefined();
  });

  it("should show the add definition form when New definition is clicked", () => {
    render(
      <DefinitionList
        keys={Object.keys(testDefinitions)}
        definitions={testDefinitions}
        selectedKey={null}
        onSelect={vi.fn()}
        onAdd={vi.fn()}
        onRemove={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByText("New definition"));
    expect(screen.getByPlaceholderText("definition-key")).toBeDefined();
  });

  it("should call onAdd when submitting a new definition via Enter", async () => {
    const onAdd = vi.fn(async () => {});
    render(
      <DefinitionList
        keys={Object.keys(testDefinitions)}
        definitions={testDefinitions}
        selectedKey={null}
        onSelect={vi.fn()}
        onAdd={onAdd}
        onRemove={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByText("New definition"));
    const input = screen.getByPlaceholderText("definition-key");
    fireEvent.change(input, { target: { value: "new-flag" } });
    await act(async () => {
      fireEvent.keyDown(input, { key: "Enter" });
    });
    expect(onAdd).toHaveBeenCalledWith("new-flag");
  });

  it("should call onAdd when clicking Save button", async () => {
    const onAdd = vi.fn(async () => {});
    render(
      <DefinitionList
        keys={Object.keys(testDefinitions)}
        definitions={testDefinitions}
        selectedKey={null}
        onSelect={vi.fn()}
        onAdd={onAdd}
        onRemove={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByText("New definition"));
    const input = screen.getByPlaceholderText("definition-key");
    fireEvent.change(input, { target: { value: "new-flag" } });
    await act(async () => {
      fireEvent.click(screen.getByText("Save"));
    });
    expect(onAdd).toHaveBeenCalledWith("new-flag");
  });

  it("should not call onAdd for duplicate keys", () => {
    const onAdd = vi.fn(async () => {});
    render(
      <DefinitionList
        keys={Object.keys(testDefinitions)}
        definitions={testDefinitions}
        selectedKey={null}
        onSelect={vi.fn()}
        onAdd={onAdd}
        onRemove={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByText("New definition"));
    const input = screen.getByPlaceholderText("definition-key");
    fireEvent.change(input, { target: { value: "feature-a" } });
    fireEvent.keyDown(input, { key: "Enter" });
    expect(onAdd).not.toHaveBeenCalled();
  });

  it("should cancel adding with Escape key", () => {
    render(
      <DefinitionList
        keys={Object.keys(testDefinitions)}
        definitions={testDefinitions}
        selectedKey={null}
        onSelect={vi.fn()}
        onAdd={vi.fn()}
        onRemove={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByText("New definition"));
    const input = screen.getByPlaceholderText("definition-key");
    fireEvent.keyDown(input, { key: "Escape" });
    expect(screen.getByText("New definition")).toBeDefined();
  });

  it("should cancel adding with X button", () => {
    render(
      <DefinitionList
        keys={Object.keys(testDefinitions)}
        definitions={testDefinitions}
        selectedKey={null}
        onSelect={vi.fn()}
        onAdd={vi.fn()}
        onRemove={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByText("New definition"));
    fireEvent.click(screen.getByLabelText("Cancel adding definition"));
    expect(screen.getByText("New definition")).toBeDefined();
  });

  it("should keep form open when onAdd rejects", async () => {
    const onAdd = vi.fn(() => Promise.reject(new Error("add failed")));
    render(
      <DefinitionList
        keys={Object.keys(testDefinitions)}
        definitions={testDefinitions}
        selectedKey={null}
        onSelect={vi.fn()}
        onAdd={onAdd}
        onRemove={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByText("New definition"));
    const input = screen.getByPlaceholderText("definition-key");
    fireEvent.change(input, { target: { value: "new-flag" } });

    await act(async () => {
      fireEvent.keyDown(input, { key: "Enter" });
      // Wait for the async rejection to be caught
      await new Promise((r) => setTimeout(r, 10));
    });

    // The form should still be open
    expect(screen.getByPlaceholderText("definition-key")).toBeDefined();
    expect(screen.getByDisplayValue("new-flag")).toBeDefined();
  });

  it("should pass dirtyKeys and validationErrors to list items", () => {
    render(
      <DefinitionList
        keys={Object.keys(testDefinitions)}
        definitions={testDefinitions}
        selectedKey="feature-a"
        dirtyKeys={["feature-a"]}
        validationErrors={{ "feature-a": [{ path: ["value"], message: "err" }] }}
        onSelect={vi.fn()}
        onAdd={vi.fn()}
        onRemove={vi.fn()}
      />,
    );
    // Should render without error and show the items
    expect(screen.getByText("feature-a")).toBeDefined();
  });

  it("renders unfetched keys from keys prop that are not in definitions", () => {
    render(
      <DefinitionList
        keys={["feature-a", "feature-b", "feature-c", "feature-d"]}
        definitions={testDefinitions}
        selectedKey={null}
        onSelect={vi.fn()}
        onAdd={vi.fn()}
        onRemove={vi.fn()}
      />,
    );
    expect(screen.getByText("feature-d")).toBeDefined();
    const items = screen.getAllByRole("status");
    const featureDStatus = items.find((el) => el.getAttribute("aria-label")?.includes("feature-d"));
    expect(featureDStatus?.getAttribute("aria-label")).toContain("unfetched");
  });

  it("should not call onAdd for keys already in keys array", () => {
    const onAdd = vi.fn(async () => {});
    render(
      <DefinitionList
        keys={Object.keys(testDefinitions)}
        definitions={testDefinitions}
        selectedKey={null}
        onSelect={vi.fn()}
        onAdd={onAdd}
        onRemove={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByText("New definition"));
    const input = screen.getByPlaceholderText("definition-key");
    fireEvent.change(input, { target: { value: "feature-a" } });
    fireEvent.keyDown(input, { key: "Enter" });
    expect(onAdd).not.toHaveBeenCalled();
  });

  it("filters unfetched keys by search", () => {
    render(
      <DefinitionList
        keys={["feature-a", "unfetched-flag"]}
        definitions={{ "feature-a": testDefinitions["feature-a"] }}
        selectedKey={null}
        onSelect={vi.fn()}
        onAdd={vi.fn()}
        onRemove={vi.fn()}
      />,
    );
    const searchInput = screen.getByPlaceholderText("Search definitions...");
    fireEvent.change(searchInput, { target: { value: "unfetched" } });
    expect(screen.queryByText("feature-a")).toBeNull();
    expect(screen.getByText("unfetched-flag")).toBeDefined();
  });
});
