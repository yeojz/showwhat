import { S3AuthError, S3StorageError } from "./errors.js";
import type { S3DataOptions, S3RequestSigner } from "./types.js";
import { parseListObjectsV2 } from "./xml.js";

interface PutOptions {
  etag?: string;
  ifNoneMatch?: boolean;
}

export class S3Client {
  readonly #endpoint: string;
  readonly #bucket: string;
  readonly #prefix: string;
  readonly #signer: S3RequestSigner;

  constructor(options: Omit<S3DataOptions, "region">) {
    this.#endpoint = options.endpoint.replace(/\/+$/, "");
    this.#bucket = options.bucket;
    this.#prefix = options.prefix ? options.prefix.replace(/\/+$/, "") : "";
    this.#signer = options.signer;
  }

  #buildUrl(path: string): string {
    const parts = [this.#endpoint, this.#bucket];
    if (this.#prefix) parts.push(this.#prefix);
    parts.push(path);
    return parts.join("/");
  }

  async #send(request: Request): Promise<Response> {
    const signed = await this.#signer.sign(request);
    return fetch(signed);
  }

  #checkAuth(status: number, url: string): void {
    if (status === 401 || status === 403) {
      throw new S3AuthError(`Access denied: ${url}`, status);
    }
  }

  #checkStatus(res: Response, url: string): void {
    this.#checkAuth(res.status, url);
    if (!res.ok) {
      throw new S3StorageError(
        `S3 request failed: ${res.status} ${res.statusText} (${url})`,
        res.status,
      );
    }
  }

  async getObject(key: string): Promise<{ body: unknown; etag: string } | null> {
    const url = this.#buildUrl(key);
    const req = new Request(url, { method: "GET" });
    const res = await this.#send(req);

    if (res.status === 404) return null;
    this.#checkStatus(res, url);

    const body: unknown = await res.json();
    const etag = res.headers.get("ETag") ?? "";
    return { body, etag };
  }

  async putObject(key: string, body: unknown, options?: PutOptions): Promise<string> {
    const url = this.#buildUrl(key);
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (options?.etag) headers["If-Match"] = options.etag;
    if (options?.ifNoneMatch) headers["If-None-Match"] = "*";

    const req = new Request(url, {
      method: "PUT",
      headers,
      body: JSON.stringify(body),
    });
    const res = await this.#send(req);
    this.#checkStatus(res, url);

    return res.headers.get("ETag") ?? "";
  }

  async deleteObject(key: string): Promise<void> {
    const url = this.#buildUrl(key);
    const req = new Request(url, { method: "DELETE" });
    const res = await this.#send(req);
    // S3 returns 204 on successful delete, but also 200 sometimes
    // 404 is fine — object already gone
    if (res.status !== 204 && res.status !== 200 && res.status !== 404) {
      this.#checkStatus(res, url);
    }
  }

  async headBucket(): Promise<void> {
    const url = `${this.#endpoint}/${this.#bucket}`;
    const req = new Request(url, { method: "HEAD" });
    const res = await this.#send(req);
    this.#checkStatus(res, url);
  }

  async listObjects(prefix: string): Promise<string[]> {
    const allKeys: string[] = [];
    let continuationToken: string | undefined;

    do {
      const fullPrefix = this.#prefix ? `${this.#prefix}/${prefix}` : prefix;
      const url = new URL(`${this.#endpoint}/${this.#bucket}`);
      url.searchParams.set("list-type", "2");
      url.searchParams.set("prefix", fullPrefix);
      if (continuationToken) {
        url.searchParams.set("continuation-token", continuationToken);
      }

      const req = new Request(url.toString(), { method: "GET" });
      const res = await this.#send(req);
      this.#checkStatus(res, url.toString());

      const xml = await res.text();
      const result = parseListObjectsV2(xml);

      allKeys.push(...result.keys);
      continuationToken = result.isTruncated ? result.nextContinuationToken : undefined;
    } while (continuationToken);

    return allKeys;
  }
}
