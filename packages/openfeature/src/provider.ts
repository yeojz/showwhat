import type {
  EvaluationContext,
  JsonValue,
  Provider,
  ResolutionDetails,
} from "@openfeature/server-sdk";
import { ErrorCode, StandardResolutionReasons } from "@openfeature/server-sdk";
import type { DefinitionReader, Dependencies, ShowWhatOptions } from "showwhat";
import { showwhat } from "showwhat";
import { toShowwhatContext } from "./context.js";
import { mapShowwhatError } from "./errors.js";

export type ShowwhatProviderOptions = Omit<ShowWhatOptions, "data"> & {
  data: DefinitionReader;
  deps?: Dependencies;
};

export class ShowwhatProvider implements Provider {
  readonly metadata = { name: "showwhat" } as const;
  readonly runsOn = "server" as const;

  #options: ShowwhatProviderOptions;

  constructor(options: ShowwhatProviderOptions) {
    this.#options = options;
  }

  async initialize(): Promise<void> {
    if (this.#options.data.load) {
      await this.#options.data.load();
    }
  }

  async onClose(): Promise<void> {
    if (this.#options.data.close) {
      await this.#options.data.close();
    }
  }

  async resolveBooleanEvaluation(
    flagKey: string,
    defaultValue: boolean,
    context: EvaluationContext,
  ): Promise<ResolutionDetails<boolean>> {
    return this.#resolve(
      flagKey,
      defaultValue,
      context,
      (v): v is boolean => typeof v === "boolean",
    );
  }

  async resolveStringEvaluation(
    flagKey: string,
    defaultValue: string,
    context: EvaluationContext,
  ): Promise<ResolutionDetails<string>> {
    return this.#resolve(flagKey, defaultValue, context, (v): v is string => typeof v === "string");
  }

  async resolveNumberEvaluation(
    flagKey: string,
    defaultValue: number,
    context: EvaluationContext,
  ): Promise<ResolutionDetails<number>> {
    return this.#resolve(flagKey, defaultValue, context, (v): v is number => typeof v === "number");
  }

  async resolveObjectEvaluation<T extends JsonValue>(
    flagKey: string,
    defaultValue: T,
    context: EvaluationContext,
  ): Promise<ResolutionDetails<T>> {
    return this.#resolve(
      flagKey,
      defaultValue,
      context,
      isJsonValue as (value: unknown) => value is T,
    );
  }

  async #resolve<T>(
    flagKey: string,
    defaultValue: T,
    evalCtx: EvaluationContext,
    typeGuard: (value: unknown) => value is T,
  ): Promise<ResolutionDetails<T>> {
    const ctx = toShowwhatContext(evalCtx, this.#options.logger);

    try {
      const results = await showwhat({
        keys: [flagKey],
        context: ctx,
        deps: this.#options.deps,
        options: this.#options,
      });

      const entry = results[flagKey];

      if (!entry.success) {
        const mapped = mapShowwhatError(entry.error);
        return {
          value: defaultValue,
          reason: StandardResolutionReasons.ERROR,
          errorCode: mapped.errorCode,
          errorMessage: mapped.errorMessage,
        };
      }

      const value = entry.value;

      if (!typeGuard(value)) {
        return {
          value: defaultValue,
          reason: StandardResolutionReasons.ERROR,
          errorCode: ErrorCode.TYPE_MISMATCH,
          errorMessage: `Flag "${flagKey}" resolved to ${typeof value}, expected a compatible type`,
        };
      }

      const hasConditions = entry.meta.variation.conditionCount > 0;

      return {
        value,
        variant: entry.meta.variation.id ?? String(entry.meta.variation.index),
        reason: hasConditions
          ? StandardResolutionReasons.TARGETING_MATCH
          : StandardResolutionReasons.STATIC,
      };
    } catch (error: unknown) {
      const mapped = mapShowwhatError(error);
      return {
        value: defaultValue,
        reason: StandardResolutionReasons.ERROR,
        errorCode: mapped.errorCode,
        errorMessage: mapped.errorMessage,
      };
    }
  }
}

function isJsonValue(value: unknown): value is JsonValue {
  if (value === null) {
    return true;
  }

  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return true;
  }

  if (Array.isArray(value)) {
    return value.every(isJsonValue);
  }

  if (typeof value === "object") {
    return Object.values(value as Record<string, unknown>).every(isJsonValue);
  }

  return false;
}
