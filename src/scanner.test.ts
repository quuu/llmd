import { describe, expect, test } from "bun:test";
import { join } from "node:path";
import { getRelativePath, scanMarkdownFiles } from "./scanner";

const FIXTURES_DIR = join(import.meta.dir, "../test-fixtures/docs");

describe("scanMarkdownFiles", () => {
  test("finds all markdown files in directory", async () => {
    const files = await scanMarkdownFiles(FIXTURES_DIR);

    expect(files.length).toBeGreaterThan(0);
    expect(files.some((f) => f.name === "README.md")).toBe(true);
    expect(files.some((f) => f.name === "API.md")).toBe(true);
  });

  test("finds nested markdown files", async () => {
    const files = await scanMarkdownFiles(FIXTURES_DIR);

    expect(files.some((f) => f.path.includes("subdirectory"))).toBe(true);
    expect(files.some((f) => f.name === "guide.md")).toBe(true);
  });

  test("ignores node_modules", async () => {
    const files = await scanMarkdownFiles(FIXTURES_DIR);

    expect(files.some((f) => f.path.includes("node_modules"))).toBe(false);
  });

  test("returns sorted files", async () => {
    const files = await scanMarkdownFiles(FIXTURES_DIR);

    for (let i = 1; i < files.length; i++) {
      expect(files[i]!.path >= files[i - 1]!.path).toBe(true);
    }
  });

  test("respects max depth", async () => {
    const filesDepth1 = await scanMarkdownFiles(FIXTURES_DIR, 1);
    const filesDepth3 = await scanMarkdownFiles(FIXTURES_DIR, 3);

    expect(filesDepth3.length).toBeGreaterThanOrEqual(filesDepth1.length);
  });

  test("calculates correct depth", async () => {
    const files = await scanMarkdownFiles(FIXTURES_DIR);
    const rootFile = files.find((f) => f.name === "README.md");
    const nestedFile = files.find((f) => f.path.includes("subdirectory") && f.name === "guide.md");

    expect(rootFile?.depth).toBe(0);
    expect(nestedFile?.depth).toBeGreaterThan(0);
  });
});

describe("getRelativePath", () => {
  test("returns relative path from root", () => {
    const result = getRelativePath("/Users/test/docs/README.md", "/Users/test/docs");
    expect(result).toBe("README.md");
  });

  test("handles nested paths", () => {
    const result = getRelativePath("/Users/test/docs/sub/file.md", "/Users/test/docs");
    expect(result).toBe("sub/file.md");
  });
});
