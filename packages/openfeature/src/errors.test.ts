import { describe, it, expect } from "vitest";
import { ErrorCode } from "@openfeature/server-sdk";
import {
  DefinitionNotFoundError,
  DefinitionInactiveError,
  VariationNotFoundError,
  ValidationError,
  DataError,
  ShowwhatError,
} from "showwhat";
import { mapShowwhatError } from "./errors.js";

describe("mapShowwhatError", () => {
  it("maps DefinitionNotFoundError to FLAG_NOT_FOUND", () => {
    const error = new DefinitionNotFoundError("missing");
    const result = mapShowwhatError(error);
    expect(result.errorCode).toBe(ErrorCode.FLAG_NOT_FOUND);
    expect(result.errorMessage).toBe(error.message);
  });

  it("maps DefinitionInactiveError to FLAG_NOT_FOUND", () => {
    const error = new DefinitionInactiveError("inactive");
    const result = mapShowwhatError(error);
    expect(result.errorCode).toBe(ErrorCode.FLAG_NOT_FOUND);
    expect(result.errorMessage).toBe(error.message);
  });

  it("maps VariationNotFoundError to GENERAL", () => {
    const error = new VariationNotFoundError("no variation");
    const result = mapShowwhatError(error);
    expect(result.errorCode).toBe(ErrorCode.GENERAL);
    expect(result.errorMessage).toBe(error.message);
  });

  it("maps ValidationError to INVALID_CONTEXT", () => {
    const error = new ValidationError("bad context");
    const result = mapShowwhatError(error);
    expect(result.errorCode).toBe(ErrorCode.INVALID_CONTEXT);
    expect(result.errorMessage).toBe(error.message);
  });

  it("maps DataError to GENERAL", () => {
    const error = new DataError("data failed");
    const result = mapShowwhatError(error);
    expect(result.errorCode).toBe(ErrorCode.GENERAL);
    expect(result.errorMessage).toBe(error.message);
  });

  it("maps generic ShowwhatError to GENERAL", () => {
    const error = new ShowwhatError("generic showwhat error");
    const result = mapShowwhatError(error);
    expect(result.errorCode).toBe(ErrorCode.GENERAL);
    expect(result.errorMessage).toBe(error.message);
  });

  it("maps a plain Error to GENERAL with its message", () => {
    const error = new Error("plain error");
    const result = mapShowwhatError(error);
    expect(result.errorCode).toBe(ErrorCode.GENERAL);
    expect(result.errorMessage).toBe("plain error");
  });

  it("maps a non-Error value to GENERAL with stringified message", () => {
    const result = mapShowwhatError("string error");
    expect(result.errorCode).toBe(ErrorCode.GENERAL);
    expect(result.errorMessage).toBe("string error");
  });
});
