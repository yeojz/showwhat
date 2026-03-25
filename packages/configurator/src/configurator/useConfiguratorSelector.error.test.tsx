import { describe, it, expect, vi } from "vitest";
import { renderHook } from "@testing-library/react";
import { useConfiguratorSelector } from "./useConfiguratorSelector.js";

describe("useConfiguratorSelector error handling", () => {
  it("throws when used outside a Configurator provider", () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => {
      renderHook(() => useConfiguratorSelector((s) => s.selectedKey));
    }).toThrow("useConfiguratorSelector must be used within a <Configurator> component");
    consoleSpy.mockRestore();
  });
});
