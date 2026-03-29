import { describe, it, expect } from "vitest";
import { parseListObjectsV2 } from "./xml.js";

const SINGLE_PAGE = `<?xml version="1.0" encoding="UTF-8"?>
<ListBucketResult xmlns="http://s3.amazonaws.com/doc/2006-03-01/">
  <Name>my-bucket</Name>
  <Prefix>definitions/</Prefix>
  <IsTruncated>false</IsTruncated>
  <Contents>
    <Key>definitions/feature-a.json</Key>
    <Size>128</Size>
  </Contents>
  <Contents>
    <Key>definitions/feature-b.json</Key>
    <Size>256</Size>
  </Contents>
</ListBucketResult>`;

const TRUNCATED_PAGE = `<?xml version="1.0" encoding="UTF-8"?>
<ListBucketResult xmlns="http://s3.amazonaws.com/doc/2006-03-01/">
  <Name>my-bucket</Name>
  <Prefix>definitions/</Prefix>
  <IsTruncated>true</IsTruncated>
  <NextContinuationToken>abc123</NextContinuationToken>
  <Contents>
    <Key>definitions/feature-a.json</Key>
    <Size>128</Size>
  </Contents>
</ListBucketResult>`;

const EMPTY_LIST = `<?xml version="1.0" encoding="UTF-8"?>
<ListBucketResult xmlns="http://s3.amazonaws.com/doc/2006-03-01/">
  <Name>my-bucket</Name>
  <Prefix>definitions/</Prefix>
  <IsTruncated>false</IsTruncated>
</ListBucketResult>`;

describe("parseListObjectsV2", () => {
  it("extracts keys from a single-page response", () => {
    const result = parseListObjectsV2(SINGLE_PAGE);
    expect(result.keys).toEqual(["definitions/feature-a.json", "definitions/feature-b.json"]);
    expect(result.isTruncated).toBe(false);
    expect(result.nextContinuationToken).toBeUndefined();
  });

  it("extracts continuation token from truncated response", () => {
    const result = parseListObjectsV2(TRUNCATED_PAGE);
    expect(result.keys).toEqual(["definitions/feature-a.json"]);
    expect(result.isTruncated).toBe(true);
    expect(result.nextContinuationToken).toBe("abc123");
  });

  it("returns empty keys for empty bucket", () => {
    const result = parseListObjectsV2(EMPTY_LIST);
    expect(result.keys).toEqual([]);
    expect(result.isTruncated).toBe(false);
  });
});
