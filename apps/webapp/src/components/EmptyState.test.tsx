import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { EmptyState } from "./EmptyState.js";

describe("EmptyState", () => {
  it("renders the heading and description", () => {
    render(<EmptyState onCreateNew={vi.fn()} onImportClick={vi.fn()} />);
    expect(screen.getByText("showwhat")).toBeDefined();
    expect(screen.getByText("Feature flag configuration")).toBeDefined();
  });

  it("renders both logo images", () => {
    render(<EmptyState onCreateNew={vi.fn()} onImportClick={vi.fn()} />);
    const logos = screen.getAllByAltText("showwhat");
    expect(logos).toHaveLength(2);
  });

  it("renders Create new and Import existing action cards", () => {
    render(<EmptyState onCreateNew={vi.fn()} onImportClick={vi.fn()} />);
    expect(screen.getByText("Create new")).toBeDefined();
    expect(screen.getByText("Start from scratch")).toBeDefined();
    expect(screen.getByText("Import existing")).toBeDefined();
    expect(screen.getByText("Load from YAML or JSON")).toBeDefined();
  });

  it("calls onCreateNew when Create new card is clicked", async () => {
    const user = userEvent.setup();
    const onCreateNew = vi.fn();
    render(<EmptyState onCreateNew={onCreateNew} onImportClick={vi.fn()} />);

    await user.click(screen.getByText("Create new"));
    expect(onCreateNew).toHaveBeenCalledOnce();
  });

  it("calls onImportClick when Import existing card is clicked", async () => {
    const user = userEvent.setup();
    const onImportClick = vi.fn();
    render(<EmptyState onCreateNew={vi.fn()} onImportClick={onImportClick} />);

    await user.click(screen.getByText("Import existing"));
    expect(onImportClick).toHaveBeenCalledOnce();
  });
});
