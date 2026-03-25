import type { Resolution } from "@showwhat/core";

export type PreviewResult =
  | {
      status: "success";
      value: unknown;
      meta: Resolution["meta"];
    }
  | { status: "inactive"; message: string }
  | { status: "no-match"; message: string }
  | { status: "error"; message: string };
