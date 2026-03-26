import { z } from "zod";
import { InvalidContextError } from "../errors.js";

const IsoUtcDatetime = z.iso.datetime();

export function parseDate(key: string, raw: string): Date {
  if (!IsoUtcDatetime.safeParse(raw).success) {
    throw new InvalidContextError(key, raw);
  }
  return new Date(raw);
}
