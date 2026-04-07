import { describe, it, expect, beforeEach } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { createPreviewStore } from "./preview-store.js";
import { createTestStorage } from "./test-storage.js";

describe("preview-store", () => {
  let useStore: ReturnType<typeof createPreviewStore>;

  beforeEach(() => {
    useStore = createPreviewStore({ storage: createTestStorage() });
  });

  it("starts with empty text fields", () => {
    const { result } = renderHook(() => useStore());
    expect(result.current.contextText).toBe("");
    expect(result.current.annotationsText).toBe("");
    expect(result.current.evaluatorText).toBe("");
  });

  it("sets contextText", () => {
    const { result } = renderHook(() => useStore());
    act(() => result.current.setContextText('{"env":"prod"}'));
    expect(result.current.contextText).toBe('{"env":"prod"}');
  });

  it("sets annotationsText", () => {
    const { result } = renderHook(() => useStore());
    act(() => result.current.setAnnotationsText('{"bucket":42}'));
    expect(result.current.annotationsText).toBe('{"bucket":42}');
  });

  it("sets evaluatorText", () => {
    const { result } = renderHook(() => useStore());
    act(() => result.current.setEvaluatorText("tier:true"));
    expect(result.current.evaluatorText).toBe("tier:true");
  });

  it("resets all fields to empty", () => {
    const { result } = renderHook(() => useStore());
    act(() => {
      result.current.setContextText("ctx");
      result.current.setAnnotationsText("ann");
      result.current.setEvaluatorText("eval");
    });
    act(() => result.current.resetPreview());
    expect(result.current.contextText).toBe("");
    expect(result.current.annotationsText).toBe("");
    expect(result.current.evaluatorText).toBe("");
  });

  it("persists and rehydrates from storage", async () => {
    const storage = createTestStorage();
    const store1 = createPreviewStore({ storage });

    const { result: r1 } = renderHook(() => store1());
    act(() => {
      r1.current.setContextText('{"key":"value"}');
      r1.current.setAnnotationsText('{"a":1}');
      r1.current.setEvaluatorText("geo:false");
    });

    // Create a second store from the same storage to simulate page reload
    const store2 = createPreviewStore({ storage });
    const { result: r2 } = renderHook(() => store2());

    // Zustand persist rehydrates asynchronously
    await new Promise((r) => setTimeout(r, 50));

    expect(r2.current.contextText).toBe('{"key":"value"}');
    expect(r2.current.annotationsText).toBe('{"a":1}');
    expect(r2.current.evaluatorText).toBe("geo:false");
  });
});
