import { Button, ThemeToggle } from "@showwhat/configurator";
import { cn } from "@showwhat/configurator";
import { useDefinitionStore } from "../store/definition-store.js";
import { useSourceStore } from "../store/source-store.js";
import type { AppTab } from "../hooks/useViewRouter.js";

const tabs: { value: AppTab; label: string }[] = [
  { value: "definitions", label: "Definitions" },
  { value: "sources", label: "Sources" },
  { value: "presets", label: "Presets" },
];

export function Toolbar({
  tab,
  onTabChange,
  theme,
  onThemeToggle,
}: {
  tab: AppTab;
  onTabChange: (tab: AppTab) => void;
  theme: "light" | "dark" | "system";
  onThemeToggle: (theme: "light" | "dark" | "system") => void;
}) {
  const sourceFileName = useDefinitionStore((s) => s.sourceFileName);
  const activeSourceId = useSourceStore((s) => s.activeSourceId);
  const sources = useSourceStore((s) => s.sources);
  const activeSource = activeSourceId ? sources.find((s) => s.id === activeSourceId) : undefined;

  const sourceLabel = activeSource?.label ?? sourceFileName;

  return (
    <div className="flex h-12 items-center border-b border-border px-4">
      <div className="flex min-w-0 flex-1 items-center gap-2">
        <img
          src={`${import.meta.env.BASE_URL}logo-v2-b.svg`}
          alt="showwhat"
          className="h-6 w-6 dark:hidden"
        />
        <img
          src={`${import.meta.env.BASE_URL}logo-v2-w.svg`}
          alt="showwhat"
          className="hidden h-6 w-6 dark:block"
        />
        <span className="font-mono text-sm font-semibold">showwhat</span>
        {sourceLabel && (
          <span
            className="ml-1 max-w-40 truncate text-xs text-muted-foreground"
            title={sourceLabel}
          >
            {sourceLabel}
          </span>
        )}
      </div>

      <nav className="flex shrink-0 justify-center gap-1" role="tablist">
        {tabs.map(({ value, label }) => (
          <Button
            key={value}
            variant="ghost"
            size="sm"
            role="tab"
            aria-selected={tab === value}
            className={cn(
              "h-7 px-3 text-sm",
              tab === value
                ? "bg-accent text-accent-foreground"
                : "text-muted-foreground hover:text-foreground",
            )}
            onClick={() => onTabChange(value)}
          >
            {label}
          </Button>
        ))}
      </nav>

      <div className="flex flex-1 justify-end">
        <ThemeToggle theme={theme} onToggle={onThemeToggle} />
      </div>
    </div>
  );
}
