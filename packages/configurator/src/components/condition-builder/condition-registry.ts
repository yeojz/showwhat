import { meta as stringMeta } from "./StringConditionEditor.js";
import { meta as numberMeta } from "./NumberConditionEditor.js";
import { meta as datetimeMeta } from "./DatetimeConditionEditor.js";
import { meta as boolMeta } from "./BoolConditionEditor.js";
import { meta as envMeta } from "./EnvConditionEditor.js";
import { meta as startAtMeta } from "./StartAtConditionEditor.js";
import { meta as endAtMeta } from "./EndAtConditionEditor.js";

export interface ConditionTypeMeta {
  type: string;
  label: string;
  description: string;
  defaults: Record<string, unknown>;
}

export const BUILTIN_CONDITION_TYPES: ConditionTypeMeta[] = [
  stringMeta,
  numberMeta,
  datetimeMeta,
  boolMeta,
  envMeta,
  startAtMeta,
  endAtMeta,
];

export const CONDITION_TYPE_MAP = new Map(BUILTIN_CONDITION_TYPES.map((m) => [m.type, m]));

export function getConditionMeta(type: string): ConditionTypeMeta | undefined {
  return CONDITION_TYPE_MAP.get(type);
}
