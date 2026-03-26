import { describe, it, expect, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import type { Condition } from "showwhat";
import { useConditionArray } from "./useConditionArray.js";

describe("useConditionArray", () => {
  it("backfills IDs on conditions without them", () => {
    const conditions: Condition[] = [{ type: "env", op: "eq", value: "prod" }];
    const onChange = vi.fn();
    const { result } = renderHook(() => useConditionArray(conditions, onChange));
    const first = result.current.conditions[0] as Record<string, unknown>;
    expect(first.id).toBeDefined();
    expect(typeof first.id).toBe("string");
  });

  it("preserves existing IDs", () => {
    const conditions: Condition[] = [{ id: "keep-me", type: "env", op: "eq", value: "prod" }];
    const onChange = vi.fn();
    const { result } = renderHook(() => useConditionArray(conditions, onChange));
    expect((result.current.conditions[0] as Record<string, unknown>).id).toBe("keep-me");
  });

  it("handleConditionChange updates the condition at the given index", () => {
    const conditions: Condition[] = [
      { id: "c1", type: "env", op: "eq", value: "prod" },
      { id: "c2", type: "env", op: "eq", value: "staging" },
    ];
    const onChange = vi.fn();
    const { result } = renderHook(() => useConditionArray(conditions, onChange));

    act(() => {
      result.current.handleConditionChange(0, {
        id: "c1",
        type: "env",
        op: "eq",
        value: "development",
      });
    });

    expect(onChange).toHaveBeenCalledOnce();
    const updated = onChange.mock.calls[0][0];
    expect(updated[0].value).toBe("development");
    expect(updated[1].value).toBe("staging");
  });

  it("handleConditionRemove removes the condition at the given index", () => {
    const conditions: Condition[] = [
      { id: "c1", type: "env", op: "eq", value: "prod" },
      { id: "c2", type: "env", op: "eq", value: "staging" },
    ];
    const onChange = vi.fn();
    const { result } = renderHook(() => useConditionArray(conditions, onChange));

    act(() => {
      result.current.handleConditionRemove(0);
    });

    expect(onChange).toHaveBeenCalledOnce();
    expect(onChange.mock.calls[0][0]).toHaveLength(1);
    expect(onChange.mock.calls[0][0][0].value).toBe("staging");
  });

  it("handleAddCondition adds a new condition", () => {
    const conditions: Condition[] = [{ id: "c1", type: "env", op: "eq", value: "prod" }];
    const onChange = vi.fn();
    const { result } = renderHook(() => useConditionArray(conditions, onChange));

    act(() => {
      result.current.handleAddCondition("string");
    });

    expect(onChange).toHaveBeenCalledOnce();
    const added = onChange.mock.calls[0][0];
    expect(added).toHaveLength(2);
    expect(added[1]).toEqual(expect.objectContaining({ type: "string" }));
  });

  it("handleMoveUp swaps condition with the one above it", () => {
    const conditions: Condition[] = [
      { id: "c1", type: "env", op: "eq", value: "first" },
      { id: "c2", type: "env", op: "eq", value: "second" },
    ];
    const onChange = vi.fn();
    const { result } = renderHook(() => useConditionArray(conditions, onChange));

    act(() => {
      result.current.handleMoveUp(1);
    });

    expect(onChange).toHaveBeenCalledOnce();
    const moved = onChange.mock.calls[0][0];
    expect(moved[0].value).toBe("second");
    expect(moved[1].value).toBe("first");
  });

  it("handleMoveUp does nothing when index is 0", () => {
    const conditions: Condition[] = [{ id: "c1", type: "env", op: "eq", value: "only" }];
    const onChange = vi.fn();
    const { result } = renderHook(() => useConditionArray(conditions, onChange));

    act(() => {
      result.current.handleMoveUp(0);
    });

    expect(onChange).not.toHaveBeenCalled();
  });

  it("handleMoveDown swaps condition with the one below it", () => {
    const conditions: Condition[] = [
      { id: "c1", type: "env", op: "eq", value: "first" },
      { id: "c2", type: "env", op: "eq", value: "second" },
    ];
    const onChange = vi.fn();
    const { result } = renderHook(() => useConditionArray(conditions, onChange));

    act(() => {
      result.current.handleMoveDown(0);
    });

    expect(onChange).toHaveBeenCalledOnce();
    const moved = onChange.mock.calls[0][0];
    expect(moved[0].value).toBe("second");
    expect(moved[1].value).toBe("first");
  });

  it("handleMoveDown does nothing when at last index", () => {
    const conditions: Condition[] = [{ id: "c1", type: "env", op: "eq", value: "only" }];
    const onChange = vi.fn();
    const { result } = renderHook(() => useConditionArray(conditions, onChange));

    act(() => {
      result.current.handleMoveDown(0);
    });

    expect(onChange).not.toHaveBeenCalled();
  });
});
