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

  it("defaults to configurator view with sources tab when no params", () => {
    const { result } = renderHook(() => useViewRouter());
    expect(result.current.view).toBe("configurator");
    expect(result.current.tab).toBe("sources");
  });

  it("parses view=settings from URL", () => {
    setLocation("?view=settings");
    const { result } = renderHook(() => useViewRouter());
    expect(result.current.view).toBe("settings");
    expect(result.current.tab).toBe("sources");
  });

  it("parses view=settings&tab=presets from URL", () => {
    setLocation("?view=settings&tab=presets");
    const { result } = renderHook(() => useViewRouter());
    expect(result.current.view).toBe("settings");
    expect(result.current.tab).toBe("presets");
  });

  // --- Security: allowlist validation ---

  it("falls back to configurator for unknown view values", () => {
    setLocation("?view=<script>alert(1)</script>");
    const { result } = renderHook(() => useViewRouter());
    expect(result.current.view).toBe("configurator");
  });

  it("falls back to sources for unknown tab values", () => {
    setLocation("?view=settings&tab=<img/onerror=alert(1)>");
    const { result } = renderHook(() => useViewRouter());
    expect(result.current.tab).toBe("sources");
  });

  it("falls back to configurator for empty view param", () => {
    setLocation("?view=");
    const { result } = renderHook(() => useViewRouter());
    expect(result.current.view).toBe("configurator");
  });

  it("ignores extra params and only reads view and tab", () => {
    setLocation("?view=settings&tab=presets&malicious=payload");
    const { result } = renderHook(() => useViewRouter());
    expect(result.current.view).toBe("settings");
    expect(result.current.tab).toBe("presets");
  });

  it("falls back for case-mismatched view value", () => {
    setLocation("?view=Settings");
    const { result } = renderHook(() => useViewRouter());
    expect(result.current.view).toBe("configurator");
  });

  it("parses tab param even when view resolves to configurator", () => {
    setLocation("?tab=presets");
    const { result } = renderHook(() => useViewRouter());
    expect(result.current.view).toBe("configurator");
    expect(result.current.tab).toBe("presets");
  });

  // --- navigate() ---

  it("navigate to settings calls pushState with correct URL", () => {
    const { result } = renderHook(() => useViewRouter());
    act(() => {
      result.current.navigate({ view: "settings" });
    });
    expect(pushStateSpy).toHaveBeenCalledWith(null, "", "?view=settings&tab=sources");
    expect(result.current.view).toBe("settings");
    expect(result.current.tab).toBe("sources");
  });

  it("navigate to settings with tab calls pushState with tab param", () => {
    const { result } = renderHook(() => useViewRouter());
    act(() => {
      result.current.navigate({ view: "settings", tab: "presets" });
    });
    expect(pushStateSpy).toHaveBeenCalledWith(null, "", "?view=settings&tab=presets");
    expect(result.current.view).toBe("settings");
    expect(result.current.tab).toBe("presets");
  });

  it("navigate to configurator removes all search params", () => {
    setLocation("?view=settings&tab=presets");
    const { result } = renderHook(() => useViewRouter());
    act(() => {
      result.current.navigate({ view: "configurator" });
    });
    expect(pushStateSpy).toHaveBeenCalledWith(null, "", "/");
    expect(result.current.view).toBe("configurator");
  });

  // --- popstate (browser back/forward) ---

  it("updates state on popstate event", () => {
    const { result } = renderHook(() => useViewRouter());
    expect(result.current.view).toBe("configurator");

    act(() => {
      setLocation("?view=settings&tab=presets");
      window.dispatchEvent(new PopStateEvent("popstate"));
    });

    expect(result.current.view).toBe("settings");
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
