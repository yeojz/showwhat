import { useCallback, useEffect, useState } from "react";

export type AppTab = "definitions" | "sources" | "presets";

type ViewRouter = {
  tab: AppTab;
  setTab: (tab: AppTab) => void;
};

const VALID_TABS: ReadonlySet<string> = new Set(["definitions", "sources", "presets"]);

function parseTab(search: string): AppTab {
  const params = new URLSearchParams(search);
  const raw = params.get("tab") ?? "";
  return VALID_TABS.has(raw) ? (raw as AppTab) : "definitions";
}

function buildUrl(tab: AppTab): string {
  const base = import.meta.env.BASE_URL ?? "/";
  if (tab === "definitions") return base;
  return `${base}?tab=${tab}`;
}

export function useViewRouter(): ViewRouter {
  const [tab, setTabState] = useState(() => parseTab(window.location.search));

  useEffect(() => {
    function handlePopState() {
      setTabState(parseTab(window.location.search));
    }
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  const setTab = useCallback((next: AppTab) => {
    const url = buildUrl(next);
    history.pushState(null, "", url);
    setTabState(next);
  }, []);

  return { tab, setTab };
}
