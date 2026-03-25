import { createContext, useContext } from "react";
import type { ComponentType } from "react";
import type { ConditionTypeMeta } from "./condition-registry.js";
import type { ConditionValueEditorProps } from "../../types.js";

export interface ConditionExtensions {
  extraConditionTypes: ConditionTypeMeta[];
  editorOverrides: Map<string, ComponentType<ConditionValueEditorProps>>;
}

const ConditionExtensionsContext = createContext<ConditionExtensions | null>(null);

export const ConditionExtensionsProvider = ConditionExtensionsContext.Provider;

export function useConditionExtensions(): ConditionExtensions | null {
  return useContext(ConditionExtensionsContext);
}
