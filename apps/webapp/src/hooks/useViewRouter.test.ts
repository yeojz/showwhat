import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useViewRouter } from "./useViewRouter.js";

function setLocation(search: string) {
  Object.defineProperty(window, "location", {
    writable: true,
    value: { ...window.location, search, origin: "http://localhost", pathname: "/" },
  });
}

describe("useViewRouter", () => {
  let pushStateSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    setLocation("");
    pushStateSpy = vi.spyOn(history, "pushState").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // --- Param parsing ---

  it("defaults to definitions tab when no params", () => {
    const { result } = renderHook(() => useViewRouter());
    expect(result.current.tab).toBe("definitions");
  });

  it("parses tab=sources from URL", () => {
    setLocation("?tab=sources");
    const { result } = renderHook(() => useViewRouter());
    expect(result.current.tab).toBe("sources");
  });

  it("parses tab=presets from URL", () => {
    setLocation("?tab=presets");
    const { result } = renderHook(() => useViewRouter());
    expect(result.current.tab).toBe("presets");
  });

  it("parses tab=definitions from URL", () => {
    setLocation("?tab=definitions");
    const { result } = renderHook(() => useViewRouter());
    expect(result.current.tab).toBe("definitions");
  });

  // --- Security: allowlist validation ---

  it("falls back to definitions for unknown tab values", () => {
    setLocation("?tab=<script>alert(1)</script>");
    const { result } = renderHook(() => useViewRouter());
    expect(result.current.tab).toBe("definitions");
  });

  it("falls back to definitions for empty tab param", () => {
    setLocation("?tab=");
    const { result } = renderHook(() => useViewRouter());
    expect(result.current.tab).toBe("definitions");
  });

  it("ignores extra params and only reads tab", () => {
    setLocation("?tab=presets&malicious=payload");
    const { result } = renderHook(() => useViewRouter());
    expect(result.current.tab).toBe("presets");
  });

  it("falls back for case-mismatched tab value", () => {
    setLocation("?tab=Sources");
    const { result } = renderHook(() => useViewRouter());
    expect(result.current.tab).toBe("definitions");
  });

  // --- setTab() ---

  it("setTab to sources calls pushState with correct URL", () => {
    const { result } = renderHook(() => useViewRouter());
    act(() => {
      result.current.setTab("sources");
    });
    expect(pushStateSpy).toHaveBeenCalledWith(null, "", "/?tab=sources");
    expect(result.current.tab).toBe("sources");
  });

  it("setTab to presets calls pushState with correct URL", () => {
    const { result } = renderHook(() => useViewRouter());
    act(() => {
      result.current.setTab("presets");
    });
    expect(pushStateSpy).toHaveBeenCalledWith(null, "", "/?tab=presets");
    expect(result.current.tab).toBe("presets");
  });

  it("setTab to definitions removes all search params", () => {
    setLocation("?tab=presets");
    const { result } = renderHook(() => useViewRouter());
    act(() => {
      result.current.setTab("definitions");
    });
    expect(pushStateSpy).toHaveBeenCalledWith(null, "", "/");
    expect(result.current.tab).toBe("definitions");
  });

  // --- popstate (browser back/forward) ---

  it("updates state on popstate event", () => {
    const { result } = renderHook(() => useViewRouter());
    expect(result.current.tab).toBe("definitions");

    act(() => {
      setLocation("?tab=presets");
      window.dispatchEvent(new PopStateEvent("popstate"));
    });

    expect(result.current.tab).toBe("presets");
  });

  it("cleans up popstate listener on unmount", () => {
    const removeSpy = vi.spyOn(window, "removeEventListener");
    const { unmount } = renderHook(() => useViewRouter());
    unmount();
    const popstateCalls = removeSpy.mock.calls.filter(([event]) => event === "popstate");
    expect(popstateCalls.length).toBe(1);
  });
});
