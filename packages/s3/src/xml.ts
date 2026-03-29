export interface ListObjectsV2Result {
  keys: string[];
  isTruncated: boolean;
  nextContinuationToken?: string;
}

function extractTagValue(xml: string, tag: string): string | undefined {
  const re = new RegExp(`<${tag}>([^<]*)</${tag}>`);
  const match = xml.match(re);
  return match?.[1];
}

function extractAllTagValues(xml: string, tag: string): string[] {
  const re = new RegExp(`<${tag}>([^<]*)</${tag}>`, "g");
  const values: string[] = [];
  let match: RegExpExecArray | null;
  while ((match = re.exec(xml)) !== null) {
    values.push(match[1]);
  }
  return values;
}

export function parseListObjectsV2(xml: string): ListObjectsV2Result {
  const keys = extractAllTagValues(xml, "Key");
  const isTruncated = extractTagValue(xml, "IsTruncated") === "true";
  const nextContinuationToken = extractTagValue(xml, "NextContinuationToken");

  return { keys, isTruncated, nextContinuationToken };
}
