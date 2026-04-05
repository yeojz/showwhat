import { z } from "zod";
import { DataValueSchema } from "./value.js";
import type { DataValue } from "./value.js";

export type ContextValue = DataValue;

export const ContextValueSchema = DataValueSchema;

export const ContextSchema = z.record(z.string(), ContextValueSchema);

export type Context = Record<string, ContextValue>;
