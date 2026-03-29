export interface S3RequestSigner {
  sign(request: Request): Promise<Request>;
}

export interface S3DataOptions {
  /** S3 endpoint URL, e.g. "https://s3.us-east-1.amazonaws.com" or R2 endpoint */
  endpoint: string;
  /** Bucket name */
  bucket: string;
  /** Region — defaults to "auto" (R2 uses "auto") */
  region?: string;
  /** Optional key prefix within the bucket */
  prefix?: string;
  /** Pluggable signing strategy */
  signer: S3RequestSigner;
}
