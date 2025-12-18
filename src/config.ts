// Central configuration for llmd directories

import { existsSync, mkdirSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

// Pure function: resolve exports directory path
// This is the canonical location for all llmd exports
// Future: Could be made configurable via env var or config file
export const resolveExportsDirectory = (): string => join(homedir(), ".llmd");

// Side effect: ensure exports directory exists
export const ensureExportsDirectory = (): string => {
  const exportsDir = resolveExportsDirectory();

  if (!existsSync(exportsDir)) {
    mkdirSync(exportsDir, { recursive: true });
  }

  return exportsDir;
};
