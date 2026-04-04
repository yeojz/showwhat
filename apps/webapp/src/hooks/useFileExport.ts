import { useCallback } from "react";
import yaml from "js-yaml";
import type { Presets } from "showwhat";
import type { Definitions, Definition } from "showwhat";
import { stripAutoIds } from "@showwhat/configurator";

function buildFileContent(definitions: Definitions, presets?: Presets): Record<string, unknown> {
  const clean = stripAutoIds(definitions);
  const output: Record<string, unknown> = { definitions: clean };
  if (presets && Object.keys(presets).length > 0) {
    output.presets = presets;
  }
  return output;
}

function dumpYaml(obj: unknown): string {
  return yaml.dump(obj, { indent: 2, lineWidth: 120, noRefs: true });
}

function dumpJson(obj: unknown): string {
  return JSON.stringify(obj, null, 2);
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

export function useFileExport() {
  const exportYaml = useCallback(
    (definitions: Definitions, presets?: Presets, fileName?: string) => {
      const output = buildFileContent(definitions, presets);
      download(dumpYaml(output), fileName ?? "flags.yaml", "text/yaml");
    },
    [],
  );

  const exportJson = useCallback(
    (definitions: Definitions, presets?: Presets, fileName?: string) => {
      const output = buildFileContent(definitions, presets);
      download(dumpJson(output), fileName ?? "flags.json", "application/json");
    },
    [],
  );

  const exportDefinitionYaml = useCallback((key: string, definition: Definition) => {
    const clean = stripAutoIds({ [key]: definition });
    download(dumpYaml(clean[key]), `${key}.yaml`, "text/yaml");
  }, []);

  const exportDefinitionJson = useCallback((key: string, definition: Definition) => {
    const clean = stripAutoIds({ [key]: definition });
    download(dumpJson(clean[key]), `${key}.json`, "application/json");
  }, []);

  return { exportYaml, exportJson, exportDefinitionYaml, exportDefinitionJson };
}
