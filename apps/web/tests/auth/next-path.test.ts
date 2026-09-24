import { describe, expect, test } from "bun:test";

import { safeNextPath } from "@/lib/auth/next-path";

describe("safeNextPath", () => {
  test("allows relative paths with query strings", () => {
    expect(safeNextPath("/decks/abc?x=1")).toBe("/decks/abc?x=1");
    expect(safeNextPath("/")).toBe("/");
  });

  test("rejects absolute and protocol-relative URLs", () => {
    expect(safeNextPath("https://evil.com")).toBe("/");
    expect(safeNextPath("http://evil.com/path")).toBe("/");
    expect(safeNextPath("//evil.com")).toBe("/");
    expect(safeNextPath("///evil.com")).toBe("/");
  });

  test("rejects empty, missing and non-path values", () => {
    expect(safeNextPath("")).toBe("/");
    expect(safeNextPath(null)).toBe("/");
    expect(safeNextPath(undefined)).toBe("/");
    expect(safeNextPath("decks/abc")).toBe("/");
  });
});
