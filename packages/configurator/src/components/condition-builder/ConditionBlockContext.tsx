import { createContext, useContext } from "react";
import type { ReactNode } from "react";

type ConditionBlockChrome = {
  typeBadge: ReactNode;
  controls: ReactNode;
};

const ConditionBlockContext = createContext<ConditionBlockChrome | null>(null);

export function ConditionBlockProvider({
  children,
  ...chrome
}: ConditionBlockChrome & { children: ReactNode }) {
  return <ConditionBlockContext.Provider value={chrome}>{children}</ConditionBlockContext.Provider>;
}

export function useConditionBlockChrome(): ConditionBlockChrome | null {
  return useContext(ConditionBlockContext);
}
