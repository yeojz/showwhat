import type { S3Client } from "@aws-sdk/client-s3";

export interface S3DataOptions {
  /** Pre-configured S3Client instance from @aws-sdk/client-s3 */
  client: S3Client;
  /** Bucket name */
  bucket: string;
  /** Optional key prefix within the bucket */
  prefix?: string;
}
