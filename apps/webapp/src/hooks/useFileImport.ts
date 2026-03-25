import { useCallback, useState } from "react";
import { parseYaml, parseObject } from "@showwhat/core";
import type { Presets } from "@showwhat/core";
import type { Definitions } from "@showwhat/core/schemas";

export type FileImportResult = {
  definitions: Definitions;
  presets?: Presets;
  fileName: string;
  format: "yaml" | "json";
};

export type FileImportError = {
  message: string;
};

export function useFileImport() {
  const [error, setError] = useState<FileImportError | null>(null);

  const importFile = useCallback(async (file: File): Promise<FileImportResult | null> => {
    setError(null);

    try {
      const text = await file.text();
      const isJson = file.name.endsWith(".json");
      const format: "yaml" | "json" = isJson ? "json" : "yaml";

      const fileFormat = isJson ? await parseObject(JSON.parse(text)) : await parseYaml(text);

      return {
        definitions: fileFormat.definitions,
        presets: fileFormat.presets,
        fileName: file.name,
        format,
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to import file";
      setError({ message });
      return null;
    }
  }, []);

  return { importFile, error };
}
