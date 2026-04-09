import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { PreviewStateProvider, usePreviewState } from "./preview-context.js";

function TestConsumer() {
  const state = usePreviewState();
  return (
    <div>
      <span data-testid="context">{state.contextText}</span>
      <span data-testid="annotations">{state.annotationsText}</span>
      <span data-testid="evaluator">{state.evaluatorText}</span>
      <button onClick={() => state.setContextText("updated")}>setContext</button>
      <button onClick={() => state.resetPreview()}>reset</button>
    </div>
  );
}

describe("PreviewStateContext", () => {
  it("provides default empty state when no provider is given", () => {
    render(<TestConsumer />);
    expect(screen.getByTestId("context").textContent).toBe("");
    expect(screen.getByTestId("annotations").textContent).toBe("");
    expect(screen.getByTestId("evaluator").textContent).toBe("");
  });

  it("provides custom values from provider", () => {
    const state = {
      contextText: '{"env":"prod"}',
      annotationsText: '{"bucket":1}',
      evaluatorText: "tier:true",
      setContextText: vi.fn(),
      setAnnotationsText: vi.fn(),
      setEvaluatorText: vi.fn(),
      resetPreview: vi.fn(),
    };

    render(
      <PreviewStateProvider value={state}>
        <TestConsumer />
      </PreviewStateProvider>,
    );

    expect(screen.getByTestId("context").textContent).toBe('{"env":"prod"}');
    expect(screen.getByTestId("annotations").textContent).toBe('{"bucket":1}');
    expect(screen.getByTestId("evaluator").textContent).toBe("tier:true");
  });

  it("calls provided setters and reset", () => {
    const state = {
      contextText: "",
      annotationsText: "",
      evaluatorText: "",
      setContextText: vi.fn(),
      setAnnotationsText: vi.fn(),
      setEvaluatorText: vi.fn(),
      resetPreview: vi.fn(),
    };

    render(
      <PreviewStateProvider value={state}>
        <TestConsumer />
      </PreviewStateProvider>,
    );

    fireEvent.click(screen.getByText("setContext"));
    expect(state.setContextText).toHaveBeenCalledWith("updated");

    fireEvent.click(screen.getByText("reset"));
    expect(state.resetPreview).toHaveBeenCalled();
  });
});
