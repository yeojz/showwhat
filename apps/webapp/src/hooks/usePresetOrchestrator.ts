import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { mergePresets } from "showwhat";
import type { Presets, PresetReader } from "showwhat";
import { createPresetUI } from "@showwhat/configurator";
import type { ConditionExtensions } from "@showwhat/configurator";
import { useDefinitionStore } from "../store/definition-store.js";
import { usePresetStore } from "../store/preset-store.js";
import { useSourceStore } from "../store/source-store.js";
import type { SplitSource } from "../store/source-store.js";
import { createHttpReader } from "../lib/http-reader.js";
import { useSourceFetch } from "./useSourceFetch.js";

interface LoadDefinitionKeyOptions {
  skipIfLoaded?: boolean;
}

export function usePresetOrchestrator() {
  // ---------------------------------------------------------------------------
  // Store selectors
  // ---------------------------------------------------------------------------
  const definitions = useDefinitionStore((s) => s.definitions);
  const filePresets = useDefinitionStore((s) => s.filePresets);
  const presetReader = useDefinitionStore((s) => s.presetReader);
  const setPresetReader = useDefinitionStore((s) => s.setPresetReader);
  const upsertDefinition = useDefinitionStore((s) => s.upsertDefinition);

  const overrides = usePresetStore((s) => s.presets);
  const sourcePresets = usePresetStore((s) => s.sourcePresets);
  const keyFilePresets = usePresetStore((s) => s.keyFilePresets);
  const sourcePresetsLastFetched = usePresetStore((s) => s.sourcePresetsLastFetched);
  const setSourcePresets = usePresetStore((s) => s.setSourcePresets);
  const upsertKeyFilePresets = usePresetStore((s) => s.upsertKeyFilePresets);
  const clearSourcePresets = usePresetStore((s) => s.clearSourcePresets);

  const activeSourceId = useSourceStore((s) => s.activeSourceId);
  const sources = useSourceStore((s) => s.sources);
  const markFetched = useSourceStore((s) => s.markFetched);

  const { reloadDefinitionKey: reloadDefKey } = useSourceFetch();

  // ---------------------------------------------------------------------------
  // Derived: active source
  // ---------------------------------------------------------------------------
  const activeSource = useMemo(
    () => sources.find((s) => s.id === activeSourceId) ?? null,
    [sources, activeSourceId],
  );

  const isSplitMode = activeSource?.mode === "split";

  // ---------------------------------------------------------------------------
  // Reader lifecycle: reconstruct presetReader on page load
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (presetReader !== null) return;
    if (!activeSource || activeSource.mode !== "split") return;

    const reader = createHttpReader(activeSource);
    setPresetReader(reader as PresetReader);
  }, [presetReader, activeSource, setPresetReader]);

  // ---------------------------------------------------------------------------
  // effectiveReader: presetReader > filePresets wrapper > undefined
  // ---------------------------------------------------------------------------
  const effectiveReader: PresetReader | undefined = useMemo(() => {
    if (presetReader) return presetReader;

    if (filePresets && Object.keys(filePresets).length > 0) {
      return {
        getPresets: async () => filePresets,
      } as PresetReader;
    }

    return undefined;
  }, [presetReader, filePresets]);

  // ---------------------------------------------------------------------------
  // Source preset fetch effect: clear on source change, fetch when reader ready
  // ---------------------------------------------------------------------------
  const [sourcePresetsLoading, setSourcePresetsLoading] = useState(false);
  const prevSourceIdRef = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    if (prevSourceIdRef.current !== undefined && prevSourceIdRef.current !== activeSourceId) {
      clearSourcePresets();
    }
    prevSourceIdRef.current = activeSourceId;

    if (!effectiveReader) return;

    let cancelled = false;
    setSourcePresetsLoading(true);

    effectiveReader
      .getPresets()
      .then((presets) => {
        if (!cancelled) {
          setSourcePresets(presets);
        }
      })
      .catch(() => {
        // Errors are handled by useSourceFetch
      })
      .finally(() => {
        if (!cancelled) setSourcePresetsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [activeSourceId, effectiveReader, clearSourcePresets, setSourcePresets]);

  // ---------------------------------------------------------------------------
  // refreshSourcePresets
  // ---------------------------------------------------------------------------
  const refreshSourcePresets = useCallback(async () => {
    if (!effectiveReader) return;
    setSourcePresetsLoading(true);
    try {
      const presets = await effectiveReader.getPresets();
      setSourcePresets(presets);
    } catch {
      // Errors handled by useSourceFetch
    } finally {
      setSourcePresetsLoading(false);
    }
  }, [effectiveReader, setSourcePresets]);

  // ---------------------------------------------------------------------------
  // cachedPresetReader: backed by already-fetched sourcePresets + keyFilePresets
  // ---------------------------------------------------------------------------
  const cachedPresetReader: PresetReader = useMemo(
    () => ({
      getPresets: async (key?: string) => {
        const base = { ...sourcePresets };
        if (key && keyFilePresets[key]) {
          return { ...base, ...keyFilePresets[key] };
        }
        return base;
      },
    }),
    [sourcePresets, keyFilePresets],
  );

  // ---------------------------------------------------------------------------
  // Condition extensions
  // ---------------------------------------------------------------------------
  const [resolvedPresets, setResolvedPresets] = useState<Presets>({});
  const [conditionExtensions, setConditionExtensions] = useState<ConditionExtensions>(() =>
    createPresetUI({}),
  );

  useEffect(() => {
    let cancelled = false;

    mergePresets({ presets: cachedPresetReader, overrides }).then((merged) => {
      if (!cancelled) {
        setResolvedPresets(merged);
        setConditionExtensions(createPresetUI(merged));
      }
    });

    return () => {
      cancelled = true;
    };
  }, [cachedPresetReader, overrides]);

  // ---------------------------------------------------------------------------
  // conditionExtensionsResolver (split mode — per-key with cache)
  // ---------------------------------------------------------------------------
  const extensionsCacheRef = useRef(new Map<string, ConditionExtensions>());

  // Invalidate cache when dependencies change
  useEffect(() => {
    extensionsCacheRef.current.clear();
  }, [sourcePresets, keyFilePresets, overrides]);

  const conditionExtensionsResolver = useMemo(() => {
    if (!isSplitMode) return undefined;

    return (key: string): ConditionExtensions => {
      const cached = extensionsCacheRef.current.get(key);
      if (cached) return cached;

      // Start async resolution, return current resolved presets as fallback
      const fallback = createPresetUI(resolvedPresets);
      extensionsCacheRef.current.set(key, fallback);

      mergePresets({ key, presets: cachedPresetReader, overrides }).then((merged) => {
        extensionsCacheRef.current.set(key, createPresetUI(merged));
      });

      return fallback;
    };
  }, [isSplitMode, cachedPresetReader, overrides, resolvedPresets]);

  // ---------------------------------------------------------------------------
  // loadDefinitionKey with per-key sequence counter
  // ---------------------------------------------------------------------------
  const [loadingDefinition, setLoadingDefinition] = useState(false);
  const sequenceCounterRef = useRef(new Map<string, number>());

  const loadDefinitionKey = useCallback(
    async (source: SplitSource, key: string, options?: LoadDefinitionKeyOptions) => {
      if (options?.skipIfLoaded && definitions[key]) return;

      // Bump sequence counter for this key
      const counter = sequenceCounterRef.current;
      const seq = (counter.get(key) ?? 0) + 1;
      counter.set(key, seq);

      setLoadingDefinition(true);
      try {
        const result = await reloadDefKey(source, key);

        // Discard stale response
        if (counter.get(key) !== seq) return;

        if (!result) return;

        upsertDefinition(key, result.definition);
        markFetched(source.id, [key]);

        if (result.filePresets && Object.keys(result.filePresets).length > 0) {
          upsertKeyFilePresets(key, result.filePresets);
        }
      } finally {
        // Only clear loading if this is still the latest call for any key
        setLoadingDefinition(false);
      }
    },
    [definitions, reloadDefKey, upsertDefinition, markFetched, upsertKeyFilePresets],
  );

  // ---------------------------------------------------------------------------
  // Return
  // ---------------------------------------------------------------------------
  return {
    cachedPresetReader,
    conditionExtensions,
    conditionExtensionsResolver,
    sourcePresets,
    keyFilePresets,
    sourcePresetsLastFetched,
    sourcePresetsLoading,
    overrides,
    refreshSourcePresets,
    loadDefinitionKey,
    loadingDefinition,
  };
}
