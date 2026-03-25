import type {
  EvaluationContext,
  JsonValue,
  Provider,
  ResolutionDetails,
} from "@openfeature/server-sdk";
import { ErrorCode, StandardResolutionReasons } from "@openfeature/server-sdk";
import type { ConditionEvaluators, DefinitionReader } from "@showwhat/core";
import { showwhat } from "@showwhat/core";
import { toShowwhatContext } from "./context.js";
import { mapShowwhatError } from "./errors.js";

export type ShowwhatProviderOptions = {
  data: DefinitionReader;
  evaluators?: ConditionEvaluators;
};

export class ShowwhatProvider implements Provider {
  readonly metadata = { name: "showwhat" } as const;
  readonly runsOn = "server" as const;

  #data: DefinitionReader;
  #evaluators: ConditionEvaluators | undefined;

  constructor(options: ShowwhatProviderOptions) {
    this.#data = options.data;
    this.#evaluators = options.evaluators;
  }

  async initialize(): Promise<void> {
    if (this.#data.load) {
      await this.#data.load();
    }
  }

  async onClose(): Promise<void> {
    if (this.#data.close) {
      await this.#data.close();
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
    const ctx = toShowwhatContext(evalCtx);

    try {
      const resolution = await showwhat({
        key: flagKey,
        context: ctx,
        options: {
          data: this.#data,
          evaluators: this.#evaluators,
        },
      });

      const value = resolution.value;

      if (!typeGuard(value)) {
        return {
          value: defaultValue,
          reason: StandardResolutionReasons.ERROR,
          errorCode: ErrorCode.TYPE_MISMATCH,
          errorMessage: `Flag "${flagKey}" resolved to ${typeof value}, expected a compatible type`,
        };
      }

      const hasConditions = resolution.meta.variation.conditionCount > 0;

      return {
        value,
        variant: String(resolution.meta.variation.index),
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
  if (value === null) return true;
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean")
    return true;
  if (Array.isArray(value)) return value.every(isJsonValue);
  if (typeof value === "object") {
    return Object.values(value as Record<string, unknown>).every(isJsonValue);
  }
  return false;
}
