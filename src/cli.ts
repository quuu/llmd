// CLI argument parsing and validation (functional style)

import { existsSync } from "node:fs";
import { dirname, isAbsolute, resolve } from "node:path";
import { loadThemePreferences } from "./events";
import { fontExists, getAvailableFonts } from "./font-themes";
import { getAvailableThemes, themeExists } from "./theme-config";
import type { CliResult, Config, ParsedArgs } from "./types";

const VERSION = "0.1.0";
const HELP_TEXT = `
llmd - Serve Markdown files as beautiful HTML

Usage:
  llmd [path] [options]
  llmd analytics [subcommand] [path] [options]

Arguments:
  path                     Directory or file to serve (default: current directory)

Commands:
  analytics [subcommand]   Manage analytics
    view [path]            Open to analytics page (default subcommand)
    enable                 Enable analytics tracking
    disable                Disable analytics tracking

Options:
  --port <number>                   Port to bind to (default: random)
  --theme <name>                    Color theme (default: dark)
                                    Built-in: dark, light, nord, dracula, solarized, monokai
                                    Custom themes: ~/.config/llmd/themes.json
  --fonts <name>                    Font combination (default: sans)
                                    Built-in: serif, sans, mono, classic, future, modern, artsy, literary, editorial
                                    Custom fonts: ~/.config/llmd/fonts.json
  --open / --no-open                Auto-open browser (default: --open)
  --watch / --no-watch              Reload on file changes (default: --no-watch)
  -h, --help                        Show this help
  --version                         Show version

Examples:
  llmd                              # Serve current directory
  llmd ./docs                       # Serve docs directory
  llmd README.md                    # Serve current dir, open to README.md
  llmd ./docs/API.md                # Serve docs dir, open to API.md
  llmd analytics                    # Open to analytics page
  llmd analytics view ~/my-project  # Open analytics for specific project
  llmd analytics enable             # Enable analytics tracking
  llmd analytics disable            # Disable analytics tracking
  llmd --fonts modern               # Use modern font combo (Tajawal + Fira Code)
  llmd --theme nord                 # Use Nord color theme
  llmd --theme dracula --watch      # Dracula theme with live reload
`;

// Pure function: parse raw CLI arguments
export const parseArgs = (args: string[]): ParsedArgs => {
  const flags: ParsedArgs["flags"] = {};
  let path: string | undefined;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (!arg) {
      continue;
    }

    if (arg === "--help" || arg === "-h") {
      flags.help = true;
    } else if (arg === "--version") {
      flags.version = true;
    } else if (arg === "analytics") {
      flags.analytics = true;
      // Check for subcommand
      const nextArg = args[i + 1];
      if (nextArg === "enable" || nextArg === "disable" || nextArg === "view") {
        flags.analyticsSubcommand = nextArg;
        i += 1; // Skip the subcommand
      } else {
        // Default to "view"
        flags.analyticsSubcommand = "view";
      }
    } else if (arg === "--port") {
      i += 1;
      flags.port = Number.parseInt(args[i] ?? "0", 10);
    } else if (arg === "--theme") {
      i += 1;
      flags.theme = args[i];
    } else if (arg === "--fonts") {
      i += 1;
      flags.fontTheme = args[i];
    } else if (arg === "--open") {
      flags.open = true;
    } else if (arg === "--no-open") {
      flags.open = false;
    } else if (arg === "--watch") {
      flags.watch = true;
    } else if (arg === "--no-watch") {
      flags.watch = false;
    } else if (!arg.startsWith("-")) {
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
    fontTheme:
      (flags.fontTheme as
        | "serif"
        | "sans"
        | "mono"
        | "classic"
        | "future"
        | "modern"
        | "artsy"
        | "literary"
        | "editorial") ??
      savedPreferences.fontTheme ??
      "sans",
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

  if (!fontExists(config.fontTheme)) {
    const available = getAvailableFonts();
    throw new Error(
      `Font "${config.fontTheme}" not found. Available fonts: ${available.join(", ")}`
    );
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

// Main CLI handler (coordinates pure functions + side effects)
export const parseCli = (args: string[]): CliResult => {
  const parsed = parseArgs(args);

  if (parsed.flags.help) {
    printHelp();
    return { type: "exit" };
  }

  if (parsed.flags.version) {
    printVersion();
    return { type: "exit" };
  }

  // Handle analytics subcommands
  if (parsed.flags.analytics && parsed.flags.analyticsSubcommand) {
    if (parsed.flags.analyticsSubcommand === "enable") {
      return { type: "analytics-enable" };
    }
    if (parsed.flags.analyticsSubcommand === "disable") {
      return { type: "analytics-disable" };
    }
    // "view" continues to normal flow
  }

  const config = createConfig(parsed);
  validateConfig(config);

  return { type: "config", config };
};
