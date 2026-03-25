import { describe, it, expect } from "bun:test";
import * as data from "@showwhat/core/data";

describe("@showwhat/core/data sub-path", () => {
  it("exports MemoryData class", () => {
    expect(typeof data.MemoryData).toBe("function");
  });

  it("exports isWritable function", () => {
    expect(typeof data.isWritable).toBe("function");
  });

  it("MemoryData is instantiable via fromObject", async () => {
    const instance = await data.MemoryData.fromObject({ definitions: {} });
    expect(instance).toBeInstanceOf(data.MemoryData);
    expect(data.isWritable(instance)).toBe(false);
  });
});
