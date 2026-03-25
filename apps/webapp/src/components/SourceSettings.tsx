import { Button, ConfirmDialog } from "@showwhat/configurator";
import { FileText, X } from "lucide-react";
import { useShallow } from "zustand/react/shallow";
import { useDefinitionStore } from "../store/definition-store.js";

export function SourceSettings({ onCloseSource }: { onCloseSource: () => void }) {
  const { sourceFileName, sourceFormat } = useDefinitionStore(
    useShallow((s) => ({
      sourceFileName: s.sourceFileName,
      sourceFormat: s.sourceFormat,
    })),
  );

  if (!sourceFileName) {
    return (
      <section>
        <h2 className="text-sm font-medium text-muted-foreground">Source</h2>
        <p className="mt-3 text-sm text-muted-foreground">No source loaded.</p>
      </section>
    );
  }

  return (
    <section>
      <h2 className="text-sm font-medium text-muted-foreground">Source</h2>
      <div className="mt-3 flex items-center justify-between rounded-lg border border-border bg-card p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-md bg-muted">
            <FileText className="h-4 w-4 text-muted-foreground" />
          </div>
          <div>
            <p className="text-sm font-medium">{sourceFileName}</p>
            <p className="text-xs text-muted-foreground">{sourceFormat?.toUpperCase()}</p>
          </div>
        </div>
        <ConfirmDialog
          title="Close source?"
          description="This will remove all definitions and unsaved changes. This action cannot be undone."
          actionLabel="Close"
          onConfirm={onCloseSource}
        >
          <Button
            variant="ghost"
            size="sm"
            className="text-destructive/60 hover:bg-destructive/10 hover:text-destructive"
          >
            <X className="mr-1.5 h-4 w-4" />
            Close
          </Button>
        </ConfirmDialog>
      </div>
    </section>
  );
}
