// Directory scanning and file discovery
import { readdirSync, type Stats, statSync } from "node:fs";
import { join, relative, sep } from "node:path";
import type { MarkdownFile, ScanOptions } from "./types";

const DEFAULT_IGNORE = [
  "node_modules",
  ".git",
  ".next",
  ".svelte-kit",
  "dist",
  "build",
  ".cache",
  ".turbo",
  ".vercel",
];

// Pure function: check if directory should be ignored
const shouldIgnore = (name: string, ignoreList: string[]): boolean =>
  ignoreList.includes(name) || name.startsWith(".");

// Pure function: calculate depth from root (directory depth, not including filename)
const calculateDepth = (path: string): number => {
  if (path === "") {
    return 0;
  }
  const parts = path.split(sep);
  // Subtract 1 because the last part is the filename
  return Math.max(0, parts.length - 1);
};

// Recursive function: scan directory for markdown files
const scanDirectory = async (
  dir: string,
  rootDir: string,
  currentDepth: number,
  options: ScanOptions
): Promise<MarkdownFile[]> => {
  // Stop at max depth
  if (currentDepth >= options.maxDepth) {
    return [];
  }

  const entries = readdirSync(dir);

  const results: MarkdownFile[] = [];

  for (const entry of entries) {
    const fullPath = join(dir, entry);
    const relativePath = relative(rootDir, fullPath);

    // Check if we should ignore this entry
    if (shouldIgnore(entry, options.ignore)) {
      continue;
    }

    // Check if entry exists and get its type
    let stats: Stats;
    try {
      stats = statSync(fullPath);
    } catch {
      continue; // Can't stat, skip
    }

    // If it's a markdown file, add it
    if (stats.isFile() && entry.endsWith(".md")) {
      results.push({
        path: relativePath,
        name: entry,
        depth: calculateDepth(relativePath),
      });
      continue;
    }

    // If it's a directory, recurse
    if (stats.isDirectory()) {
      const subResults = await scanDirectory(fullPath, rootDir, currentDepth + 1, options);
      results.push(...subResults);
    }
  }

  return results;
};

// Pure function: sort files alphabetically by path
const sortFiles = (files: MarkdownFile[]): MarkdownFile[] =>
  [...files].sort((a, b) => a.path.localeCompare(b.path));

// Main scanner function
export const scanMarkdownFiles = async (rootDir: string, maxDepth = 5): Promise<MarkdownFile[]> => {
  const options: ScanOptions = {
    root: rootDir,
    maxDepth,
    ignore: DEFAULT_IGNORE,
  };

  const files = await scanDirectory(rootDir, rootDir, 0, options);
  return sortFiles(files);
};

// Helper: get relative path for a specific file from root
export const getRelativePath = (filePath: string, rootDir: string): string =>
  relative(rootDir, filePath);
