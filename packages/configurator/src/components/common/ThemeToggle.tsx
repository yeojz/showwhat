import { Moon, Sun, Monitor } from "lucide-react";
import { Button } from "../ui/button.js";
import type { ThemeToggleProps } from "../../types.js";

const icons = {
  light: Sun,
  dark: Moon,
  system: Monitor,
} as const;

const next: Record<string, "light" | "dark" | "system"> = {
  light: "dark",
  dark: "system",
  system: "light",
};

export function ThemeToggle({ theme, onToggle }: ThemeToggleProps) {
  const Icon = icons[theme];
  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => onToggle(next[theme])}
      aria-label={`Switch to ${next[theme]} theme`}
    >
      <Icon className="h-4 w-4" />
    </Button>
  );
}
