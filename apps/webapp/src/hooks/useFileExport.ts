import { useCallback } from "react";
import yaml from "js-yaml";
import type { Presets } from "@showwhat/core";
import type { Definitions } from "@showwhat/core/schemas";
import { stripAutoIds } from "@showwhat/configurator";

function buildFileContent(definitions: Definitions, presets?: Presets): Record<string, unknown> {
  const clean = stripAutoIds(definitions);
  const output: Record<string, unknown> = { definitions: clean };
  if (presets && Object.keys(presets).length > 0) {
    output.presets = presets;
  }
  return output;
}

export function useFileExport() {
  const exportYaml = useCallback(
    (definitions: Definitions, presets?: Presets, fileName?: string) => {
      const output = buildFileContent(definitions, presets);
      const content = yaml.dump(output, { indent: 2, lineWidth: 120, noRefs: true });
      download(content, fileName ?? "flags.yaml", "text/yaml");
    },
    [],
  );

  const exportJson = useCallback(
    (definitions: Definitions, presets?: Presets, fileName?: string) => {
      const output = buildFileContent(definitions, presets);
      const content = JSON.stringify(output, null, 2);
      download(content, fileName ?? "flags.json", "application/json");
    },
    [],
  );

  return { exportYaml, exportJson };
}

function download(content: string, fileName: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 100);
}
