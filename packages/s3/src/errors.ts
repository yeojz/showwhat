import { ShowwhatError } from "@showwhat/core";

export class S3StorageError extends ShowwhatError {
  constructor(
    message: string,
    public readonly status: number,
    cause?: unknown,
  ) {
    super(message, cause !== undefined ? { cause } : undefined);
    this.name = "S3StorageError";
  }
}

export class S3AuthError extends S3StorageError {
  constructor(message: string, status: number) {
    super(message, status);
    this.name = "S3AuthError";
  }
}

export class S3ConflictError extends S3StorageError {
  constructor(public readonly key: string) {
    super(`Definition "${key}" was modified externally since last read`, 412);
    this.name = "S3ConflictError";
  }
}
