import { createContext, useContext } from "react";
import type { ConditionEvaluator } from "@showwhat/core";

const FallbackEvaluatorContext = createContext<ConditionEvaluator | null>(null);

export const FallbackEvaluatorProvider = FallbackEvaluatorContext.Provider;

export function useFallbackEvaluator(): ConditionEvaluator | null {
  return useContext(FallbackEvaluatorContext);
}
