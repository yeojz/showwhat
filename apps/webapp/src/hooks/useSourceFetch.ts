import { useCallback, useState } from "react";
import type { Definition } from "showwhat";
import type { Presets } from "showwhat";
import type { RemoteSource, KeyedSource } from "../store/source-store.js";
import {
  KeyedSourceHttpReader,
  createHttpReader,
  formatFetchError,
  type SourceFetchResult,
} from "../lib/http-reader.js";

export type { SourceFetchResult };

export type SourceFetchError = {
  message: string;
  failedKeys?: string[];
};

export function useSourceFetch() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<SourceFetchError | null>(null);

  const fetchSource = useCallback(
    async (source: RemoteSource): Promise<SourceFetchResult | null> => {
      setLoading(true);
      setError(null);

      try {
        const reader = createHttpReader(source);
        const result = await reader.fetchSource();

        if ("failedKeys" in result && result.failedKeys && result.failedKeys.length > 0) {
          setError({
            message: `Loaded ${result.keys.length} definitions, but ${result.failedKeys.length} failed`,
            failedKeys: result.failedKeys,
          });
        }

        return result;
      } catch (err) {
        setError({ message: formatFetchError(err) });
        return null;
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  const reloadKeyList = useCallback(async (source: KeyedSource): Promise<string[] | null> => {
    setLoading(true);
    setError(null);

    try {
      const reader = new KeyedSourceHttpReader(source);
      return await reader.listKeys();
    } catch (err) {
      setError({ message: formatFetchError(err) });
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const reloadDefinitionKey = useCallback(
    async (
      source: KeyedSource,
      key: string,
    ): Promise<{ definition: Definition; filePresets?: Presets } | null> => {
      setLoading(true);
      setError(null);

      try {
        const reader = new KeyedSourceHttpReader(source);
        return await reader.fetchDefinitionKey(key);
      } catch (err) {
        setError({ message: formatFetchError(err) });
        return null;
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  const reloadPresets = useCallback(
    async (
      url: string,
      format: "yaml" | "json",
      headers?: Record<string, string>,
    ): Promise<Presets | null> => {
      setLoading(true);
      setError(null);

      try {
        const reader = new KeyedSourceHttpReader({
          id: "",
          mode: "keyed",
          label: "",
          format,
          baseUrl: "",
          definitionKeys: [],
          headers,
        });
        const presets = await reader.fetchPresets(url, format, headers);
        return presets ?? null;
      } catch (err) {
        setError({ message: formatFetchError(err) });
        return null;
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  return { fetchSource, reloadKeyList, reloadDefinitionKey, reloadPresets, loading, error };
}
