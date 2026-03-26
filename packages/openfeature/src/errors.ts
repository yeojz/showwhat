import { ErrorCode } from "@openfeature/server-sdk";
import {
  DefinitionNotFoundError,
  DefinitionInactiveError,
  VariationNotFoundError,
  ValidationError,
  DataError,
  ShowwhatError,
} from "showwhat";

type ErrorMapping = {
  errorCode: ErrorCode;
  errorMessage: string;
};

export function mapShowwhatError(error: unknown): ErrorMapping {
  if (error instanceof DefinitionNotFoundError) {
    return { errorCode: ErrorCode.FLAG_NOT_FOUND, errorMessage: error.message };
  }

  if (error instanceof DefinitionInactiveError) {
    return { errorCode: ErrorCode.FLAG_NOT_FOUND, errorMessage: error.message };
  }

  if (error instanceof VariationNotFoundError) {
    return { errorCode: ErrorCode.GENERAL, errorMessage: error.message };
  }

  if (error instanceof ValidationError) {
    return { errorCode: ErrorCode.INVALID_CONTEXT, errorMessage: error.message };
  }

  if (error instanceof DataError) {
    return { errorCode: ErrorCode.GENERAL, errorMessage: error.message };
  }

  if (error instanceof ShowwhatError) {
    return { errorCode: ErrorCode.GENERAL, errorMessage: error.message };
  }

  const message = error instanceof Error ? error.message : String(error);
  return { errorCode: ErrorCode.GENERAL, errorMessage: message };
}
