import { stringEvaluator } from "./conditions/string.js";
import { numberEvaluator } from "./conditions/number.js";
import { boolEvaluator } from "./conditions/bool.js";
import { datetimeEvaluator } from "./conditions/datetime.js";
import type { ConditionEvaluator, ConditionEvaluators } from "./conditions/types.js";
import { CONDITION_TYPES, type PrimitiveConditionType } from "./schemas/condition.js";
import { PRIMITIVE_TYPES } from "./schemas/preset.js";
import type { Presets } from "./schemas/preset.js";

// ── Reserved names ───────────────────────────────────────────────────────────

const RESERVED_CONDITION_TYPES = new Set([...Object.values(CONDITION_TYPES), "__custom"]);

const BUILTIN_EVALUATORS: Record<PrimitiveConditionType, ConditionEvaluator> = {
  string: stringEvaluator,
  number: numberEvaluator,
  bool: boolEvaluator,
  datetime: datetimeEvaluator,
};

// ── Factory ──────────────────────────────────────────────────────────────────

export function createPresetConditions(presets: Presets): ConditionEvaluators {
  const result: ConditionEvaluators = {};

  for (const [name, preset] of Object.entries(presets)) {
    if (RESERVED_CONDITION_TYPES.has(name)) {
      throw new Error(`Preset name "${name}" collides with a built-in or reserved condition type`);
    }

    if (!PRIMITIVE_TYPES.has(preset.type)) {
      continue;
    }

    const primitiveType = preset.type as PrimitiveConditionType;
    const delegateEvaluator = BUILTIN_EVALUATORS[primitiveType];
    const presetKey = preset.key!;

    const overrides = preset.overrides ?? {};

    const evaluator: ConditionEvaluator = ({
      condition,
      context,
      annotations,
      deps,
      depth,
      createRegex,
      evaluators,
      logger,
    }) => {
      const rec = condition as Record<string, unknown>;
      return delegateEvaluator({
        condition: { ...rec, ...overrides, type: primitiveType, key: presetKey },
        context,
        annotations,
        deps,
        depth,
        createRegex,
        evaluators,
        logger,
      });
    };

    result[name] = evaluator;
  }

  return result;
}
