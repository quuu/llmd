// CLI argument parsing and validation (functional style)

import { existsSync } from "node:fs";
import { dirname, isAbsolute, resolve } from "node:path";
import pkg from "../package.json" with { type: "json" };
import { loadThemePreferences } from "./events";
import { getAvailableThemes, themeExists } from "./theme-config";
import type { CliResult, Config, ParsedArgs } from "./types";

const VERSION = pkg.version;

// Subcommand help texts
const ANALYTICS_HELP = `
llmd analytics - Manage analytics tracking

Usage:
  llmd analytics [subcommand] [path] [options]

Subcommands:
  view [path]              Open to analytics page (default)
  enable                   Enable analytics tracking
  disable                  Disable analytics tracking

Options:
  -h, --help               Show this help
`;

const DB_HELP = `
llmd db - Manage database

Usage:
  llmd db [subcommand] [options]

Subcommands:
  check                    Show database size and statistics
  cleanup                  Delete events older than N days
  clear                    Clear all events and resources from database

Options:
  --days <number>          Number of days for db cleanup (default: 30)
  -h, --help               Show this help
`;

const ARCHIVE_HELP = `
llmd archive - Manage highlight archive

Usage:
  llmd archive [subcommand]

Subcommands:
  list                     List all backed up files
  show <path>              Show details for a specific backup
  clear                    Delete all backed up files

The archive stores backup copies of files when highlights are created.
Archive location: ~/.cache/llmd/file-backups

Options:
  -h, --help               Show this help
`;

const HIGHLIGHTS_HELP = `
llmd highlights - Manage highlights feature

Usage:
  llmd highlights [subcommand]

Subcommands:
  enable                   Enable highlights feature (default)
  disable                  Disable highlights feature

Options:
  -h, --help               Show this help
`;

const EXPORT_HELP = `
llmd export - Export highlights to markdown

Usage:
  llmd export [path]

Arguments:
  path                     Directory to export highlights from (default: current directory)

Exports all highlights from a directory to a markdown file in ~/.llmd/

Options:
  -h, --help               Show this help
`;

const HELP_TEXT = `
llmd - Serve Markdown files as beautiful HTML

Usage:
  llmd [path] [options]
  llmd <command>

Arguments:
  path                     Directory or file to serve (default: current directory)

Commands:
  docs                     View llmd documentation
  analytics                Manage analytics tracking
  highlights               Manage highlights feature
  db                       Manage database
  archive                  Manage highlight archive
  export                   Export highlights to markdown

  Use 'llmd <command> --help' for more information about a command.

Options:
  --port <number>          Port to bind to (default: random)
  --theme <name>           Color theme (default: dark)
  --fonts <name>           Font combination (default: sans)
  --open / --no-open       Auto-open browser (default: --open)
  --watch / --no-watch     Reload on file changes (default: --no-watch)
  -h, --help               Show this help
  --version                Show version

For more information, visit: https://github.com/pbzona/llmd
`;

// Helper: parse analytics command and subcommand
const parseAnalyticsCommand = (
  args: string[],
  index: number
): { subcommand: "view" | "enable" | "disable"; nextIndex: number } => {
  const nextArg = args[index + 1];
  if (nextArg === "enable" || nextArg === "disable" || nextArg === "view") {
    return { subcommand: nextArg, nextIndex: index + 1 };
  }
  return { subcommand: "view", nextIndex: index };
};

// Helper: parse db command and subcommand
const parseDbCommand = (
  args: string[],
  index: number
): { subcommand: "check" | "cleanup" | "clear"; nextIndex: number } => {
  const nextArg = args[index + 1];
  if (nextArg === "check" || nextArg === "cleanup" || nextArg === "clear") {
    return { subcommand: nextArg, nextIndex: index + 1 };
  }
  return { subcommand: "check", nextIndex: index };
};

// Helper: parse highlights command and subcommand
const parseHighlightsCommand = (
  args: string[],
  index: number
): { subcommand: "enable" | "disable"; nextIndex: number } => {
  const nextArg = args[index + 1];
  if (nextArg === "enable" || nextArg === "disable") {
    return { subcommand: nextArg, nextIndex: index + 1 };
  }
  return { subcommand: "enable", nextIndex: index };
};

// Helper: parse archive command and subcommand
const parseArchiveCommand = (
  args: string[],
  index: number
): { subcommand: "list" | "show" | "clear"; nextIndex: number; path?: string } => {
  const nextArg = args[index + 1];

  if (nextArg === "list" || nextArg === "clear") {
    return { subcommand: nextArg, nextIndex: index + 1 };
  }

  if (nextArg === "show") {
    const path = args[index + 2];
    return { subcommand: "show", nextIndex: index + 2, path };
  }

  return { subcommand: "list", nextIndex: index };
};

// Helper: parse boolean flags
const parseBooleanFlag = (arg: string, flags: ParsedArgs["flags"]): boolean => {
  if (arg === "--help" || arg === "-h") {
    flags.help = true;
    return true;
  }
  if (arg === "--version") {
    flags.version = true;
    return true;
  }
  if (arg === "docs") {
    flags.docs = true;
    return true;
  }
  if (arg === "--open") {
    flags.open = true;
    return true;
  }
  if (arg === "--no-open") {
    flags.open = false;
    return true;
  }
  if (arg === "--watch") {
    flags.watch = true;
    return true;
  }
  if (arg === "--no-watch") {
    flags.watch = false;
    return true;
  }
  return false;
};

// Helper: parse flags with values
const parseValueFlag = (
  arg: string,
  args: string[],
  index: number,
  flags: ParsedArgs["flags"]
): number => {
  if (arg === "--port") {
    flags.port = Number.parseInt(args[index + 1] ?? "0", 10);
    return index + 1;
  }
  if (arg === "--theme") {
    flags.theme = args[index + 1];
    return index + 1;
  }
  if (arg === "analytics") {
    flags.analytics = true;
    const { subcommand, nextIndex } = parseAnalyticsCommand(args, index);
    flags.analyticsSubcommand = subcommand;
    return nextIndex;
  }
  if (arg === "highlights") {
    flags.highlights = true;
    const { subcommand, nextIndex } = parseHighlightsCommand(args, index);
    flags.highlightsSubcommand = subcommand;
    return nextIndex;
  }
  if (arg === "db") {
    flags.db = true;
    const { subcommand, nextIndex } = parseDbCommand(args, index);
    flags.dbSubcommand = subcommand;
    return nextIndex;
  }
  if (arg === "archive") {
    flags.archive = true;
    const { subcommand, nextIndex, path: archivePath } = parseArchiveCommand(args, index);
    flags.archiveSubcommand = subcommand;
    flags.archivePath = archivePath;
    return nextIndex;
  }
  if (arg === "export") {
    flags.export = true;
    // Check if next arg is a path (doesn't start with --)
    const nextArg = args[index + 1];
    if (nextArg && !nextArg.startsWith("--")) {
      flags.exportPath = nextArg;
      return index + 1;
    }
    return index;
  }
  if (arg === "--days") {
    const daysValue = Number.parseInt(args[index + 1] ?? "30", 10);
    flags.days = Number.isNaN(daysValue) ? 30 : daysValue;
    return index + 1;
  }
  return index;
};

// Pure function: parse raw CLI arguments
export const parseArgs = (args: string[]): ParsedArgs => {
  const flags: ParsedArgs["flags"] = {};
  let path: string | undefined;

  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (!arg) {
      continue;
    }

    // Try parsing as boolean flag
    if (parseBooleanFlag(arg, flags)) {
      continue;
    }

    // Try parsing as value flag
    const newIndex = parseValueFlag(arg, args, i, flags);
    if (newIndex !== i) {
      i = newIndex;
      continue;
    }

    // Otherwise, it's a path argument
    if (!arg.startsWith("-")) {
      path = arg;
    }
  }

  return { path, flags };
};

// Pure function: resolve path to directory and optional file
const resolvePath = (inputPath: string): { directory: string; initialFile?: string } => {
  const absolutePath = isAbsolute(inputPath) ? inputPath : resolve(process.cwd(), inputPath);

  // Check if it's a file (ends with .md)
  if (absolutePath.endsWith(".md")) {
    return {
      directory: dirname(absolutePath),
      initialFile: absolutePath,
    };
  }

  // It's a directory
  return { directory: absolutePath };
};

// Side effect: create config from parsed args with defaults (loads saved preferences from database)
export const createConfig = (parsed: ParsedArgs): Config => {
  const { path = ".", flags } = parsed;
  const { directory, initialFile } = resolvePath(path);

  // Load saved theme preferences from database
  const savedPreferences = loadThemePreferences();

  return {
    directory,
    initialFile,
    port: flags.port ?? 0,
    theme: flags.theme ?? savedPreferences.theme ?? "dark",
    open: flags.open ?? true,
    watch: flags.watch ?? false,
    openToAnalytics: flags.analytics ?? false,
  };
};

// Side effect: validate config (throws on error)
export const validateConfig = (config: Config): void => {
  if (!existsSync(config.directory)) {
    throw new Error(`Directory not found: ${config.directory}`);
  }

  if (!themeExists(config.theme)) {
    const available = getAvailableThemes();
    throw new Error(`Theme "${config.theme}" not found. Available themes: ${available.join(", ")}`);
  }

  if (config.port < 0 || config.port > 65_535) {
    throw new Error(`Invalid port: ${config.port}. Must be 0-65535`);
  }
};

// Side effect functions: print to stdout
export const printHelp = (): void => {
  console.log(HELP_TEXT);
};

export const printVersion = (): void => {
  console.log(`llmd v${VERSION}`);
};

// Helper: handle analytics command results
const handleAnalyticsCommand = (subcommand: "view" | "enable" | "disable"): CliResult | null => {
  if (subcommand === "enable") {
    return { type: "analytics-enable" };
  }
  if (subcommand === "disable") {
    return { type: "analytics-disable" };
  }
  return null; // "view" continues to normal flow
};

// Helper: handle db command results
const handleDbCommand = (subcommand: "check" | "cleanup" | "clear", days?: number): CliResult => {
  if (subcommand === "check") {
    return { type: "db-check" };
  }
  if (subcommand === "cleanup") {
    return { type: "db-cleanup", days: days ?? 30 };
  }
  return { type: "db-clear" };
};

// Helper: handle highlights command results
const handleHighlightsCommand = (subcommand: "enable" | "disable"): CliResult => {
  if (subcommand === "enable") {
    return { type: "highlights-enable" };
  }
  return { type: "highlights-disable" };
};

// Helper: handle archive command results
const handleArchiveCommand = (subcommand: "list" | "show" | "clear", path?: string): CliResult => {
  if (subcommand === "list") {
    return { type: "archive-list" };
  }
  if (subcommand === "show") {
    if (!path) {
      throw new Error("archive show requires a path argument");
    }
    return { type: "archive-show", path };
  }
  return { type: "archive-clear" };
};

// Main CLI handler (coordinates pure functions + side effects)
export const parseCli = (args: string[]): CliResult => {
  const parsed = parseArgs(args);

  // Early exits for help/version
  if (parsed.flags.help) {
    printHelp();
    return { type: "exit" };
  }
  if (parsed.flags.version) {
    printVersion();
    return { type: "exit" };
  }

  // Command handling
  if (parsed.flags.docs) {
    return { type: "docs" };
  }

  if (parsed.flags.analytics && parsed.flags.analyticsSubcommand) {
    const result = handleAnalyticsCommand(parsed.flags.analyticsSubcommand);
    if (result) {
      return result;
    }
  }

  if (parsed.flags.highlights && parsed.flags.highlightsSubcommand) {
    return handleHighlightsCommand(parsed.flags.highlightsSubcommand);
  }

  if (parsed.flags.db && parsed.flags.dbSubcommand) {
    return handleDbCommand(parsed.flags.dbSubcommand, parsed.flags.days);
  }

  if (parsed.flags.archive && parsed.flags.archiveSubcommand) {
    return handleArchiveCommand(parsed.flags.archiveSubcommand, parsed.flags.archivePath);
  }

  if (parsed.flags.export) {
    const path = parsed.flags.exportPath || process.cwd();
    return { type: "export", path };
  }

  // Default: create server config
  const config = createConfig(parsed);
  validateConfig(config);
  return { type: "config", config };
};
