import { describe, it, expectTypeOf } from "vitest";
import type {
  DataValue,
  ContextValue,
  Context,
  AnnotationValue,
  Annotations,
  ConditionEvaluator,
  ConditionEvaluatorArgs,
  Dependencies,
} from "./index.js";

describe("type contracts", () => {
  describe("DataValue", () => {
    it("accepts primitives", () => {
      expectTypeOf<string>().toExtend<DataValue>();
      expectTypeOf<number>().toExtend<DataValue>();
      expectTypeOf<boolean>().toExtend<DataValue>();
    });

    it("accepts arrays of primitives", () => {
      expectTypeOf<string[]>().toExtend<DataValue>();
      expectTypeOf<number[]>().toExtend<DataValue>();
    });

    it("accepts nested records", () => {
      expectTypeOf<{ a: string; b: { c: number } }>().toExtend<DataValue>();
    });

    it("is the base for ContextValue and AnnotationValue", () => {
      expectTypeOf<ContextValue>().toEqualTypeOf<DataValue>();
      expectTypeOf<AnnotationValue>().toEqualTypeOf<DataValue>();
    });
  });

  describe("Context", () => {
    it("is a flat record of ContextValue", () => {
      expectTypeOf<Context>().toEqualTypeOf<Record<string, ContextValue>>();
    });
  });

  describe("Annotations", () => {
    it("is a record of AnnotationValue", () => {
      expectTypeOf<Annotations>().toEqualTypeOf<Record<string, AnnotationValue>>();
    });
  });

  describe("Dependencies", () => {
    it("is a record of unknown", () => {
      expectTypeOf<Dependencies>().toEqualTypeOf<Record<string, unknown>>();
    });
  });

  describe("ConditionEvaluator", () => {
    it("is a function taking args and returning Promise<boolean>", () => {
      expectTypeOf<ConditionEvaluator>().toExtend<
        (args: ConditionEvaluatorArgs) => Promise<boolean>
      >();
    });

    it("args include condition, context, annotations, deps", () => {
      expectTypeOf<ConditionEvaluatorArgs["condition"]>().toEqualTypeOf<unknown>();
      expectTypeOf<ConditionEvaluatorArgs["context"]>().toEqualTypeOf<Readonly<Context>>();
      expectTypeOf<ConditionEvaluatorArgs["annotations"]>().toEqualTypeOf<Annotations>();
      expectTypeOf<ConditionEvaluatorArgs["deps"]>().toEqualTypeOf<Readonly<Dependencies>>();
    });
  });
});
