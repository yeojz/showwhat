import { FilePlus2, Upload } from "lucide-react";

function ActionCard({
  icon: Icon,
  label,
  description,
  animationDelay,
  onClick,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  description: string;
  animationDelay: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className="group flex flex-col items-center gap-3 rounded-lg border border-border bg-card p-6 text-center shadow-sm transition-all hover:border-primary/50 hover:bg-accent animate-fade-up"
      style={{ animationDelay }}
      onClick={onClick}
    >
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 transition-colors group-hover:bg-primary/15">
        <Icon className="h-5 w-5 text-primary" />
      </div>
      <div>
        <p className="text-sm font-medium">{label}</p>
        <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
      </div>
    </button>
  );
}

export function EmptyState({
  onCreateNew,
  onImportClick,
}: {
  onCreateNew: () => void;
  onImportClick: () => void;
}) {
  return (
    <div className="relative flex h-full items-center justify-center overflow-hidden">
      {/* Subtle radial gradient background */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse at center, oklch(0.7 0.15 50 / 0.05), transparent 70%)",
        }}
      />
      <div className="relative w-full max-w-lg space-y-10">
        <div className="flex flex-col items-center text-center">
          <img
            src={`${import.meta.env.BASE_URL}logo-v2-b.svg`}
            alt="showwhat"
            className="mb-4 h-16 w-16 animate-fade-in dark:hidden"
          />
          <img
            src={`${import.meta.env.BASE_URL}logo-v2-w.svg`}
            alt="showwhat"
            className="mb-4 hidden h-16 w-16 animate-fade-in dark:block"
          />
          <h1
            className="text-4xl font-semibold tracking-tight animate-fade-up"
            style={{ animationDelay: "100ms" }}
          >
            showwhat
          </h1>
          <p
            className="mt-2 text-lg text-muted-foreground animate-fade-up"
            style={{ animationDelay: "150ms" }}
          >
            Feature flag configuration
          </p>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <ActionCard
            icon={FilePlus2}
            label="Create new"
            description="Start from scratch"
            animationDelay="200ms"
            onClick={onCreateNew}
          />
          <ActionCard
            icon={Upload}
            label="Import existing"
            description="Load from YAML or JSON"
            animationDelay="300ms"
            onClick={onImportClick}
          />
        </div>
      </div>
    </div>
  );
}
