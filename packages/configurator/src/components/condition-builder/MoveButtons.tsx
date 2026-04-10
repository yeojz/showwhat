import { ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "../ui/button.js";

type MoveButtonsProps = {
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  size?: string;
};

export function MoveButtons({ onMoveUp, onMoveDown, size = "h-8 w-8" }: MoveButtonsProps) {
  const hidden = !onMoveUp && !onMoveDown;

  return (
    <div className={hidden ? "invisible" : undefined}>
      <Button
        variant="ghost"
        size="icon"
        className={`${size} text-muted-foreground hover:text-foreground`}
        disabled={!onMoveUp}
        onClick={onMoveUp}
        aria-label="Move up"
      >
        <ChevronUp className="h-3.5 w-3.5" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className={`${size} text-muted-foreground hover:text-foreground`}
        disabled={!onMoveDown}
        onClick={onMoveDown}
        aria-label="Move down"
      >
        <ChevronDown className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}
