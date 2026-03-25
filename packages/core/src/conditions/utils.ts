import { InvalidContextError } from "../errors.js";

export function parseDate(key: string, raw: string): Date {
  const d = new Date(raw);
  if (isNaN(d.getTime())) {
    throw new InvalidContextError(key, raw);
  }
  return d;
}
