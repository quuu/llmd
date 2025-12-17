// Shared TypeScript types for llmd

export type Config = {
  // Directory to serve markdown files from
  directory: string;
  // Optional specific file to open initially
  initialFile?: string;
  // Server options
  port: number;
  host: string;
  // UI options
  theme: string; // Theme name (built-in or custom)
  fontTheme: string; // Font name (built-in or custom)
  // Behavior flags
  open: boolean;
  watch: boolean;
};

export type MarkdownFile = {
  // Relative path from root directory (e.g., "README.md" or "docs/api.md")
  path: string;
  // Just the filename
  name: string;
  // Directory depth (0 = root)
  depth: number;
};

export type ParsedArgs = {
  path?: string;
  flags: {
    port?: number;
    host?: string;
    theme?: string;
    fontTheme?: string;
    open?: boolean;
    watch?: boolean;
    help?: boolean;
    version?: boolean;
  };
};

export type ScanOptions = {
  // Root directory to scan
  root: string;
  // Maximum depth to traverse
  maxDepth: number;
  // Directories to ignore
  ignore: string[];
};
