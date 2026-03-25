import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ThemeToggle } from "./ThemeToggle.js";

describe("ThemeToggle", () => {
  it("renders the correct icon for light theme", () => {
    render(<ThemeToggle theme="light" onToggle={vi.fn()} />);
    const button = screen.getByRole("button", { name: /switch to dark theme/i });
    expect(button).toBeDefined();
  });

  it("cycles light -> dark", () => {
    const onToggle = vi.fn();
    render(<ThemeToggle theme="light" onToggle={onToggle} />);
    fireEvent.click(screen.getByRole("button"));
    expect(onToggle).toHaveBeenCalledWith("dark");
  });

  it("cycles dark -> system", () => {
    const onToggle = vi.fn();
    render(<ThemeToggle theme="dark" onToggle={onToggle} />);
    fireEvent.click(screen.getByRole("button"));
    expect(onToggle).toHaveBeenCalledWith("system");
  });

  it("cycles system -> light", () => {
    const onToggle = vi.fn();
    render(<ThemeToggle theme="system" onToggle={onToggle} />);
    fireEvent.click(screen.getByRole("button"));
    expect(onToggle).toHaveBeenCalledWith("light");
  });

  it("has an accessible aria-label reflecting the next theme", () => {
    render(<ThemeToggle theme="dark" onToggle={vi.fn()} />);
    expect(screen.getByRole("button", { name: /switch to system theme/i })).toBeDefined();
  });
});
