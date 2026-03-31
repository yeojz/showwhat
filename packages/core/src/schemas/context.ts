import { z } from "zod";
import { DataValueSchema } from "./value.js";
import type { DataValue } from "./value.js";

export type ContextValue = DataValue;

export const ContextSchema = z.record(z.string(), DataValueSchema);

export type Context = Record<string, ContextValue>;
