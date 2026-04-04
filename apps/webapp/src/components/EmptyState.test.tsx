import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { EmptyState } from "./EmptyState.js";

describe("EmptyState", () => {
  it("renders the heading and description", () => {
    render(<EmptyState onCreateNew={vi.fn()} onGoToSources={vi.fn()} />);
    expect(screen.getByText("showwhat")).toBeDefined();
    expect(screen.getByText("Feature flag configuration")).toBeDefined();
  });

  it("renders both logo images", () => {
    render(<EmptyState onCreateNew={vi.fn()} onGoToSources={vi.fn()} />);
    const logos = screen.getAllByAltText("showwhat");
    expect(logos).toHaveLength(2);
  });

  it("renders Load from source and Create new action cards", () => {
    render(<EmptyState onCreateNew={vi.fn()} onGoToSources={vi.fn()} />);
    expect(screen.getByText("Load from source")).toBeDefined();
    expect(screen.getByText("Connect to a remote source")).toBeDefined();
    expect(screen.getByText("Create new")).toBeDefined();
    expect(screen.getByText("Start from scratch")).toBeDefined();
  });

  it("calls onCreateNew when Create new card is clicked", async () => {
    const user = userEvent.setup();
    const onCreateNew = vi.fn();
    render(<EmptyState onCreateNew={onCreateNew} onGoToSources={vi.fn()} />);

    await user.click(screen.getByText("Create new"));
    expect(onCreateNew).toHaveBeenCalledOnce();
  });

  it("calls onGoToSources when Load from source card is clicked", async () => {
    const user = userEvent.setup();
    const onGoToSources = vi.fn();
    render(<EmptyState onCreateNew={vi.fn()} onGoToSources={onGoToSources} />);

    await user.click(screen.getByText("Load from source"));
    expect(onGoToSources).toHaveBeenCalledOnce();
  });

  it("renders Go to Sources link", () => {
    render(<EmptyState onCreateNew={vi.fn()} onGoToSources={vi.fn()} />);
    expect(screen.getByText("Go to Sources")).toBeDefined();
  });

  it("calls onGoToSources when Go to Sources link is clicked", async () => {
    const user = userEvent.setup();
    const onGoToSources = vi.fn();
    render(<EmptyState onCreateNew={vi.fn()} onGoToSources={onGoToSources} />);

    await user.click(screen.getByText("Go to Sources"));
    expect(onGoToSources).toHaveBeenCalledOnce();
  });
});
