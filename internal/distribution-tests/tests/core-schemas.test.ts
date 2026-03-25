import { describe, it, expect } from "vitest";
import * as schemas from "@showwhat/core/schemas";

describe("@showwhat/core/schemas sub-path", () => {
  it("exports Zod schema objects", () => {
    expect(typeof schemas.DefinitionSchema).toBe("object");
    expect(typeof schemas.DefinitionsSchema).toBe("object");
    expect(typeof schemas.VariationSchema).toBe("object");
    expect(typeof schemas.ContextSchema).toBe("object");
    expect(typeof schemas.ResolutionSchema).toBe("object");
  });

  it("exports CONDITION_TYPES and CONTEXT_KEYS constants", () => {
    expect(typeof schemas.CONDITION_TYPES).toBe("object");
    expect(typeof schemas.CONTEXT_KEYS).toBe("object");
    expect(Object.keys(schemas.CONDITION_TYPES).length).toBeGreaterThan(0);
    expect(Object.keys(schemas.CONTEXT_KEYS).length).toBeGreaterThan(0);
  });

  it("exports type guard functions", () => {
    expect(typeof schemas.isAndCondition).toBe("function");
    expect(typeof schemas.isOrCondition).toBe("function");
  });
});
