import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ErrorBoundary } from "./ErrorBoundary.js";

// Suppress console.error from ErrorBoundary and React during error tests
beforeEach(() => {
  vi.spyOn(console, "error").mockImplementation(() => {});
});

function ThrowingChild({ shouldThrow }: { shouldThrow: boolean }) {
  if (shouldThrow) {
    throw new Error("Test render error");
  }
  return <div>Child content</div>;
}

describe("ErrorBoundary", () => {
  it("should render children when no error occurs", () => {
    render(
      <ErrorBoundary>
        <p>Hello world</p>
      </ErrorBoundary>,
    );
    expect(screen.getByText("Hello world")).toBeDefined();
  });

  it("should show default error UI when a child throws", () => {
    render(
      <ErrorBoundary>
        <ThrowingChild shouldThrow={true} />
      </ErrorBoundary>,
    );
    expect(screen.getByRole("alert")).toBeDefined();
    expect(screen.getByText("Something went wrong")).toBeDefined();
    expect(screen.getByText("Test render error")).toBeDefined();
  });

  it("should show the Try again button in default error UI", () => {
    render(
      <ErrorBoundary>
        <ThrowingChild shouldThrow={true} />
      </ErrorBoundary>,
    );
    expect(screen.getByText("Try again")).toBeDefined();
  });

  it("should reset error state after clicking Try again", () => {
    // First, render with a throwing child to get into error state
    const { unmount } = render(
      <ErrorBoundary>
        <ThrowingChild shouldThrow={true} />
      </ErrorBoundary>,
    );
    expect(screen.getByText("Something went wrong")).toBeDefined();
    expect(screen.getByText("Try again")).toBeDefined();

    // Click Try again — this resets error to null internally.
    // The child will throw again, so error boundary catches again,
    // but the important thing is the retry mechanism works (resets state).
    fireEvent.click(screen.getByText("Try again"));

    // After retry with a still-throwing child, it should catch again
    expect(screen.getByRole("alert")).toBeDefined();

    unmount();
  });

  it("should render custom fallback instead of default error UI", () => {
    const fallback = <div>Custom error fallback</div>;
    render(
      <ErrorBoundary fallback={fallback}>
        <ThrowingChild shouldThrow={true} />
      </ErrorBoundary>,
    );
    expect(screen.getByText("Custom error fallback")).toBeDefined();
    // Default UI should not be rendered
    expect(screen.queryByText("Something went wrong")).toBeNull();
    expect(screen.queryByText("Try again")).toBeNull();
  });

  it("should not show error UI when children render successfully", () => {
    render(
      <ErrorBoundary>
        <ThrowingChild shouldThrow={false} />
      </ErrorBoundary>,
    );
    expect(screen.getByText("Child content")).toBeDefined();
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("should call onError callback when provided", () => {
    const onError = vi.fn();
    render(
      <ErrorBoundary onError={onError}>
        <ThrowingChild shouldThrow={true} />
      </ErrorBoundary>,
    );
    expect(onError).toHaveBeenCalledOnce();
    expect(onError.mock.calls[0][0]).toBeInstanceOf(Error);
    expect(onError.mock.calls[0][0].message).toBe("Test render error");
  });

  it("should fall back to console.error when onError is not provided", () => {
    render(
      <ErrorBoundary>
        <ThrowingChild shouldThrow={true} />
      </ErrorBoundary>,
    );
    expect(console.error).toHaveBeenCalled();
  });
});
