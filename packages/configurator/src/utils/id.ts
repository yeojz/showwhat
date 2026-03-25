import type { Condition, Definitions } from "@showwhat/core/schemas";

export const AUTO_ID_PREFIX = "_tmp:";

export function isAutoId(id: string | undefined): boolean {
  return id != null && id.startsWith(AUTO_ID_PREFIX);
}

/**
 * Ensures every item in the array has an `id` field.
 * Items arriving from external sources may lack IDs;
 * this function backfills them with `crypto.randomUUID()`.
 *
 * Works with union types (e.g. Condition) where not every
 * variant explicitly declares `id` — the check uses a
 * Record cast so it handles any shape safely.
 */
export function ensureIds<T>(items: T[]): T[] {
  let changed = false;
  const result = items.map((item) => {
    if ((item as Record<string, unknown>).id) return item;
    changed = true;
    return { ...item, id: `${AUTO_ID_PREFIX}${crypto.randomUUID()}` };
  });
  return changed ? result : items;
}

function removeId<T extends Record<string, unknown>>(item: T): T {
  const copy = { ...item };
  delete copy.id;
  return copy;
}

function stripId<T extends { id?: string }>(item: T): T {
  if (!isAutoId(item.id)) return item;
  return removeId(item as unknown as Record<string, unknown>) as T;
}

function stripConditionIds(conditions: Condition[]): Condition[] {
  return conditions.map((c) => {
    const rec = c as Record<string, unknown>;
    const stripped = isAutoId(rec.id as string | undefined) ? removeId(rec) : rec;
    if ((c.type === "and" || c.type === "or") && "conditions" in c) {
      return {
        ...stripped,
        conditions: stripConditionIds((c as { conditions: Condition[] }).conditions),
      } as Condition;
    }
    return stripped as Condition;
  });
}

export function stripAutoIds(definitions: Definitions): Definitions {
  const result: Definitions = {};
  for (const [key, def] of Object.entries(definitions)) {
    const cleaned = stripId(def);
    result[key] = {
      ...cleaned,
      variations: cleaned.variations.map((v) => {
        const sv = stripId(v);
        if (sv.conditions) {
          return { ...sv, conditions: stripConditionIds(sv.conditions) };
        }
        return sv;
      }),
    };
  }
  return result;
}
