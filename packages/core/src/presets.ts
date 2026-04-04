import { evaluateCondition } from "./conditions/evaluate.js";
import type { ConditionEvaluator, ConditionEvaluators } from "./conditions/types.js";
import { CONDITION_TYPES } from "./schemas/condition.js";
import type { Condition } from "./schemas/condition.js";
import type { Presets } from "./schemas/preset.js";

// ── Reserved names ────────────────────────────────────────────────────────────

const RESERVED_CONDITION_TYPES = new Set([...Object.values(CONDITION_TYPES), "__custom"]);

// ── Factory ───────────────────────────────────────────────────────────────────

export function createPresetConditions(presets: Presets): ConditionEvaluators {
  const result: ConditionEvaluators = {};

  for (const [name, preset] of Object.entries(presets)) {
    if (RESERVED_CONDITION_TYPES.has(name)) {
      throw new Error(`Preset name "${name}" collides with a built-in or reserved condition type`);
    }

    const overrides = preset.overrides ?? {};

    const evaluator: ConditionEvaluator = async ({
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
      const rewritten: Record<string, unknown> = { ...rec, ...overrides, type: preset.type };
      if (preset.key) {
        rewritten.key = preset.key;
      }
      return evaluateCondition({
        condition: rewritten as Condition,
        context,
        evaluators,
        annotations,
        deps,
        depth,
        logger,
        createRegex,
      });
    };

    result[name] = evaluator;
  }

  return result;
}
