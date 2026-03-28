import type { ZodError } from "zod";

export class ShowwhatError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = "ShowwhatError";
  }
}

export class ParseError extends ShowwhatError {
  constructor(
    message: string,
    public readonly line?: number,
  ) {
    super(message);
    this.name = "ParseError";
  }
}

function formatHeader(context?: string): string {
  return `Validation failed${context ? ` in ${context}` : ""}:`;
}

export class ValidationError extends ShowwhatError {
  public readonly issues: ZodError["issues"];

  constructor(message: string, context?: string) {
    super(`${formatHeader(context)}\n  ${message}`);
    this.name = "ValidationError";
    this.issues = [{ code: "custom" as const, message, path: [] }];
  }
}

export class SchemaValidationError extends ValidationError {
  constructor(zodError: ZodError, context?: string) {
    const lines = zodError.issues.map((i) => `[${i.path.join(".")}] ${i.message}`);
    super(lines.join("\n  "), context);
    this.name = "SchemaValidationError";
    // Overwrite the generic issue created by ValidationError with the real Zod issues
    (this as { issues: ZodError["issues"] }).issues = zodError.issues;
  }
}

export class DefinitionNotFoundError extends ShowwhatError {
  constructor(public readonly key: string) {
    super(`Definition "${key}" not found`);
    this.name = "DefinitionNotFoundError";
  }
}

export class DefinitionInactiveError extends ShowwhatError {
  constructor(public readonly key: string) {
    super(`Definition "${key}" is inactive`);
    this.name = "DefinitionInactiveError";
  }
}

export class VariationNotFoundError extends ShowwhatError {
  constructor(public readonly key: string) {
    super(`No matching variation for "${key}"`);
    this.name = "VariationNotFoundError";
  }
}

export class InvalidContextError extends ShowwhatError {
  constructor(
    public readonly key: string,
    public readonly value: string | number | boolean,
  ) {
    super(`Invalid context value for "${key}": "${value}"`);
    this.name = "InvalidContextError";
  }
}

export class DataError extends ShowwhatError {
  constructor(message: string, cause?: unknown) {
    super(message, cause !== undefined ? { cause } : undefined);
    this.name = "DataError";
  }
}

export class ConditionError extends ShowwhatError {
  constructor(
    public readonly conditionType: string,
    message: string,
    cause?: unknown,
  ) {
    super(message, cause !== undefined ? { cause } : undefined);
    this.name = "ConditionError";
  }
}
