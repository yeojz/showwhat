import { useCallback, useState } from "react";
import type { Definition, Presets } from "showwhat";
import type { HostedSource, SplitSource } from "../store/source-store.js";
import {
  SplitSourceHttpReader,
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
    async (source: HostedSource): Promise<SourceFetchResult | null> => {
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

  const reloadKeyList = useCallback(async (source: SplitSource): Promise<string[] | null> => {
    setLoading(true);
    setError(null);

    try {
      const reader = new SplitSourceHttpReader(source);
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
      source: SplitSource,
      key: string,
    ): Promise<{ definition: Definition; filePresets?: Presets } | null> => {
      setLoading(true);
      setError(null);

      try {
        const reader = new SplitSourceHttpReader(source);
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

  return { fetchSource, reloadKeyList, reloadDefinitionKey, loading, error };
}
