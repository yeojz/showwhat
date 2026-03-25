import { useCallback, useEffect, useState } from "react";

type SettingsTab = "sources" | "presets";

type NavigateDescriptor = { view: "configurator" } | { view: "settings"; tab?: SettingsTab };

type ViewRouter = {
  view: "configurator" | "settings";
  tab: SettingsTab;
  navigate: (descriptor: NavigateDescriptor) => void;
};

const VALID_VIEWS: ReadonlySet<string> = new Set(["settings"]);
const VALID_TABS: ReadonlySet<string> = new Set(["sources", "presets"]);

function parseParams(search: string): { view: "configurator" | "settings"; tab: SettingsTab } {
  const params = new URLSearchParams(search);

  const rawView = params.get("view") ?? "";
  const view = VALID_VIEWS.has(rawView) ? (rawView as "settings") : "configurator";

  const rawTab = params.get("tab") ?? "";
  const tab = VALID_TABS.has(rawTab) ? (rawTab as SettingsTab) : "sources";

  return { view, tab };
}

function buildUrl(view: "configurator" | "settings", tab: SettingsTab): string {
  if (view === "configurator") return "/";
  return `?view=${view}&tab=${tab}`;
}

export function useViewRouter(): ViewRouter {
  const [state, setState] = useState(() => parseParams(window.location.search));

  useEffect(() => {
    function handlePopState() {
      setState(parseParams(window.location.search));
    }
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  const navigate = useCallback((descriptor: NavigateDescriptor) => {
    const view = descriptor.view;
    const tab = view === "settings" ? (descriptor.tab ?? "sources") : "sources";
    const url = buildUrl(view, tab);
    history.pushState(null, "", url);
    setState({ view, tab });
  }, []);

  return { view: state.view, tab: state.tab, navigate };
}
