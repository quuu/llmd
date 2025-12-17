// Central theme configuration for easy customization

import { existsSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

export type ThemeColors = {
  bg: string;
  fg: string;
  border: string;
  hover: string;
  accent: string;
  codeBg: string;
  sidebarBg: string;
  // Icon colors
  folderIcon: string;
  fileIcon: string;
};

// Built-in color themes
const BUILT_IN_THEMES: Record<string, ThemeColors> = {
  // Original dark theme
  dark: {
    bg: "#1a1a1a",
    fg: "#e0e0e0",
    border: "#333",
    hover: "#2a2a2a",
    accent: "#4a9eff",
    codeBg: "#2d2d2d",
    sidebarBg: "#151515",
    folderIcon: "#a78bfa",
    fileIcon: "#fbbf24",
  },
  // Original light theme
  light: {
    bg: "#f7f4f0",
    fg: "#1a1a1a",
    border: "#e4dfd8",
    hover: "#eee9e3",
    accent: "#0066cc",
    codeBg: "#eee9e3",
    sidebarBg: "#eee9e3",
    folderIcon: "#2563eb",
    fileIcon: "#f97316",
  },
  // New: Nord-inspired theme
  nord: {
    bg: "#2e3440",
    fg: "#d8dee9",
    border: "#3b4252",
    hover: "#434c5e",
    accent: "#88c0d0", // Lighter Nord frost color for better contrast
    codeBg: "#3b4252",
    sidebarBg: "#2e3440",
    folderIcon: "#81a1c1",
    fileIcon: "#ebcb8b",
  },
  // New: Dracula-inspired theme
  dracula: {
    bg: "#282a36",
    fg: "#f8f8f2",
    border: "#44475a",
    hover: "#44475a",
    accent: "#ff79c6",
    codeBg: "#44475a",
    sidebarBg: "#21222c",
    folderIcon: "#bd93f9",
    fileIcon: "#ffb86c",
  },
  // New: Solarized Light (with improved contrast)
  solarized: {
    bg: "#fdf6e3",
    fg: "#073642", // base02 - darkest gray for maximum contrast
    border: "#93a1a1", // base1 for visible borders
    hover: "#eee8d5",
    accent: "#1d6db8", // Even darker blue for WCAG AA compliance
    codeBg: "#eee8d5",
    sidebarBg: "#eee8d5",
    folderIcon: "#859900", // Green
    fileIcon: "#dc322f", // Red for better contrast than orange
  },
  // New: Monokai-inspired theme
  monokai: {
    bg: "#272822",
    fg: "#f8f8f2",
    border: "#3e3d32",
    hover: "#3e3d32",
    accent: "#ae81ff",
    codeBg: "#3e3d32",
    sidebarBg: "#1e1f1c",
    folderIcon: "#a6e22e",
    fileIcon: "#fd971f",
  },
};

// Load custom themes from unified config file
const loadCustomThemes = (): Record<string, ThemeColors> => {
  // Check XDG_CONFIG_HOME first, fallback to ~/.config
  const xdgConfig = process.env.XDG_CONFIG_HOME;
  const configDir = xdgConfig ? join(xdgConfig, "llmd") : join(homedir(), ".config", "llmd");
  const themesPath = join(configDir, "themes.json");

  if (!existsSync(themesPath)) {
    return {};
  }

  try {
    const content = readFileSync(themesPath, "utf-8");
    const config = JSON.parse(content);

    // Support both old format (flat) and new format (nested under colorThemes)
    const customThemes = config.colorThemes || config;

    // Validate that it's an object with theme objects
    if (typeof customThemes !== "object" || customThemes === null) {
      console.warn(`[llmd] Invalid themes.json format at ${themesPath}`);
      return {};
    }

    // Validate each theme has required properties
    const validatedThemes: Record<string, ThemeColors> = {};
    for (const [name, theme] of Object.entries(customThemes)) {
      if (typeof theme !== "object" || theme === null) {
        console.warn(`[llmd] Skipping invalid theme: ${name}`);
        continue;
      }

      const t = theme as Record<string, unknown>;
      const requiredProps = [
        "bg",
        "fg",
        "border",
        "hover",
        "accent",
        "codeBg",
        "sidebarBg",
        "folderIcon",
        "fileIcon",
      ];

      const hasAllProps = requiredProps.every((prop) => typeof t[prop] === "string");
      if (hasAllProps) {
        validatedThemes[name] = theme as ThemeColors;
      } else {
        console.warn(`[llmd] Skipping incomplete theme: ${name}`);
      }
    }

    return validatedThemes;
  } catch (error) {
    console.warn(`[llmd] Failed to load custom themes from ${themesPath}:`, error);
    return {};
  }
};

// Combine built-in and custom themes
let allThemes: Record<string, ThemeColors> | null = null;

const getAllThemes = (): Record<string, ThemeColors> => {
  if (!allThemes) {
    const customThemes = loadCustomThemes();
    allThemes = { ...BUILT_IN_THEMES, ...customThemes };
  }
  return allThemes;
};

// Get colors for a specific theme
export const getThemeColors = (themeName: string): ThemeColors => {
  const themes = getAllThemes();
  const theme = themes[themeName];

  if (!theme) {
    throw new Error(
      `Theme "${themeName}" not found. Available themes: ${Object.keys(themes).join(", ")}`
    );
  }

  return theme;
};

// Get list of available theme names
export const getAvailableThemes = (): string[] => Object.keys(getAllThemes());

// Check if a theme exists
export const themeExists = (themeName: string): boolean => themeName in getAllThemes();
