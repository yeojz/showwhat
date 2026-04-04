import { useState } from "react";
import { Eye } from "lucide-react";
import { Button } from "../ui/button.js";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "../ui/dialog.js";
import type { ConditionValueEditorProps } from "../../types.js";
import type { ComponentType } from "react";

export function createCompositePresetEditor(
  presetName: string,
  compositeType: string,
  conditions: unknown[],
) {
  function CompositePresetEditor() {
    const [open, setOpen] = useState(false);

    return (
      <div className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground">
          Composite <span className="font-mono font-medium">{compositeType.toUpperCase()}</span>{" "}
          preset ({conditions.length} condition{conditions.length !== 1 ? "s" : ""})
        </span>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={() => setOpen(true)}
          aria-label="View preset conditions"
        >
          <Eye className="h-3.5 w-3.5" />
        </Button>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{presetName}</DialogTitle>
              <DialogDescription>Read-only view of the preset conditions.</DialogDescription>
            </DialogHeader>
            <pre className="max-h-80 overflow-auto rounded bg-muted p-3 text-xs font-mono">
              {JSON.stringify(conditions, null, 2)}
            </pre>
            <DialogFooter showCloseButton />
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  CompositePresetEditor.displayName = `CompositePresetEditor(${presetName})`;
  return CompositePresetEditor as ComponentType<ConditionValueEditorProps>;
}
