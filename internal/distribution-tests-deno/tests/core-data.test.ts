import { assertEquals, assertInstanceOf } from "jsr:@std/assert";
import * as data from "@showwhat/core/data";

Deno.test("@showwhat/core/data — exports MemoryData class", () => {
  assertEquals(typeof data.MemoryData, "function");
});

Deno.test("@showwhat/core/data — exports isWritable function", () => {
  assertEquals(typeof data.isWritable, "function");
});

Deno.test("@showwhat/core/data — MemoryData is instantiable via fromObject", async () => {
  const instance = await data.MemoryData.fromObject({ definitions: {} });
  assertInstanceOf(instance, data.MemoryData);
  assertEquals(data.isWritable(instance), false);
});
