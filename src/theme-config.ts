// Central theme configuration for easy customization

import { existsSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

export type Theme = {
  // Color configuration
  colors: {
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
    // Highlight colors (borders will be derived using relative CSS colors)
    highlightBg: string; // Background color for valid highlights
    highlightStaleBg: string; // Background color for stale highlights
  };
  // Font configuration
  fonts: {
    body: string;
    heading: string;
    code: string;
    googleFontsUrl?: string; // Optional Google Fonts CSS import
  };
};

// Built-in themes (colors + fonts paired together)
const BUILT_IN_THEMES: Record<string, Theme> = {
  // Original dark theme with sans-serif fonts
  dark: {
    colors: {
      bg: "#1a1a1a",
      fg: "#e0e0e0",
      border: "#333",
      hover: "#2a2a2a",
      accent: "#4a9eff",
      codeBg: "#2d2d2d",
      sidebarBg: "#151515",
      folderIcon: "#a78bfa",
      fileIcon: "#fbbf24",
      highlightBg: "#ffdc00",
      highlightStaleBg: "#ff5252",
    },
    fonts: {
      body: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
      heading:
        '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
      code: '"SF Mono", Monaco, "Cascadia Code", "Roboto Mono", Consolas, monospace',
    },
  },
  // Original light theme with serif fonts
  light: {
    colors: {
      bg: "#f7f4f0",
      fg: "#1a1a1a",
      border: "#e4dfd8",
      hover: "#eee9e3",
      accent: "#0066cc",
      codeBg: "#eee9e3",
      sidebarBg: "#eee9e3",
      folderIcon: "#2563eb",
      fileIcon: "#f97316",
      highlightBg: "#ffeb3b",
      highlightStaleBg: "#ffcdd2",
    },
    fonts: {
      body: "Georgia, 'Times New Roman', Times, serif",
      heading: "Georgia, 'Times New Roman', Times, serif",
      code: '"Courier New", Courier, monospace',
    },
  },
  // Nord-inspired theme with modern fonts
  nord: {
    colors: {
      bg: "#2e3440",
      fg: "#d8dee9",
      border: "#3b4252",
      hover: "#434c5e",
      accent: "#88c0d0", // Lighter Nord frost color for better contrast
      codeBg: "#3b4252",
      sidebarBg: "#2e3440",
      folderIcon: "#81a1c1",
      fileIcon: "#ebcb8b",
      highlightBg: "#ebcb8b", // Nord yellow
      highlightStaleBg: "#bf616a", // Nord red
    },
    fonts: {
      body: '"Inter", sans-serif',
      heading: '"Inter", sans-serif',
      code: '"JetBrains Mono", monospace',
      googleFontsUrl:
        "https://fonts.googleapis.com/css2?family=Inter:wght@400;700&family=JetBrains+Mono:wght@400;700&display=swap",
    },
  },
  // Dracula-inspired theme with future fonts
  dracula: {
    colors: {
      bg: "#282a36",
      fg: "#f8f8f2",
      border: "#44475a",
      hover: "#44475a",
      accent: "#ff79c6",
      codeBg: "#44475a",
      sidebarBg: "#21222c",
      folderIcon: "#bd93f9",
      fileIcon: "#ffb86c",
      highlightBg: "#f1fa8c", // Dracula yellow
      highlightStaleBg: "#ff5555", // Dracula red
    },
    fonts: {
      body: '"Space Grotesk", sans-serif',
      heading: '"Space Mono", monospace',
      code: '"Space Mono", monospace',
      googleFontsUrl:
        "https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&family=Space+Grotesk:wght@400;700&display=swap",
    },
  },
  // Solarized Light with literary fonts
  solarized: {
    colors: {
      bg: "#fdf6e3",
      fg: "#073642", // base02 - darkest gray for maximum contrast
      border: "#93a1a1", // base1 for visible borders
      hover: "#eee8d5",
      accent: "#1d6db8", // Even darker blue for WCAG AA compliance
      codeBg: "#eee8d5",
      sidebarBg: "#eee8d5",
      folderIcon: "#859900", // Green
      fileIcon: "#dc322f", // Red for better contrast than orange
      highlightBg: "#b58900", // Solarized yellow
      highlightStaleBg: "#dc322f", // Solarized red
    },
    fonts: {
      body: "Newsreader, serif",
      heading: "Spectral, serif",
      code: '"Geist Mono", monospace',
      googleFontsUrl:
        "https://fonts.googleapis.com/css2?family=Spectral:wght@400;700&family=Newsreader:wght@400;700&family=Geist+Mono:wght@400;700&display=swap",
    },
  },
  // Monokai-inspired theme with monospace fonts
  monokai: {
    colors: {
      bg: "#272822",
      fg: "#f8f8f2",
      border: "#3e3d32",
      hover: "#3e3d32",
      accent: "#ae81ff",
      codeBg: "#3e3d32",
      sidebarBg: "#1e1f1c",
      folderIcon: "#a6e22e",
      fileIcon: "#fd971f",
      highlightBg: "#e6db74", // Monokai yellow
      highlightStaleBg: "#f92672", // Monokai pink/red
    },
    fonts: {
      body: '"SF Mono", Monaco, "Cascadia Code", "Roboto Mono", Consolas, monospace',
      heading: '"SF Mono", Monaco, "Cascadia Code", "Roboto Mono", Consolas, monospace',
      code: '"SF Mono", Monaco, "Cascadia Code", "Roboto Mono", Consolas, monospace',
    },
  },
};

// Load custom themes from unified config file
const loadCustomThemes = (): Record<string, Theme> => {
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

    // Support unified themes in themes.json
    const customThemes = config.themes || config;

    // Validate that it's an object with theme objects
    if (typeof customThemes !== "object" || customThemes === null) {
      console.warn(`[llmd] Invalid themes.json format at ${themesPath}`);
      return {};
    }

    // Validate each theme has required properties
    const validatedThemes: Record<string, Theme> = {};
    for (const [name, theme] of Object.entries(customThemes)) {
      if (typeof theme !== "object" || theme === null) {
        console.warn(`[llmd] Skipping invalid theme: ${name}`);
        continue;
      }

      const t = theme as Record<string, unknown>;

      // Check for colors object
      if (typeof t.colors !== "object" || t.colors === null) {
        console.warn(`[llmd] Skipping theme with missing colors: ${name}`);
        continue;
      }

      const colors = t.colors as Record<string, unknown>;
      const requiredColorProps = [
        "bg",
        "fg",
        "border",
        "hover",
        "accent",
        "codeBg",
        "sidebarBg",
        "folderIcon",
        "fileIcon",
        "highlightBg",
        "highlightStaleBg",
      ];

      const hasAllColors = requiredColorProps.every((prop) => typeof colors[prop] === "string");
      if (!hasAllColors) {
        console.warn(`[llmd] Skipping theme with incomplete colors: ${name}`);
        continue;
      }

      // Check for fonts object
      if (typeof t.fonts !== "object" || t.fonts === null) {
        console.warn(`[llmd] Skipping theme with missing fonts: ${name}`);
        continue;
      }

      const fonts = t.fonts as Record<string, unknown>;
      const requiredFontProps = ["body", "heading", "code"];

      const hasAllFonts = requiredFontProps.every((prop) => typeof fonts[prop] === "string");
      if (!hasAllFonts) {
        console.warn(`[llmd] Skipping theme with incomplete fonts: ${name}`);
        continue;
      }

      // Validate googleFontsUrl if present
      if (fonts.googleFontsUrl !== undefined && typeof fonts.googleFontsUrl !== "string") {
        console.warn(`[llmd] Skipping theme with invalid googleFontsUrl: ${name}`);
        continue;
      }

      validatedThemes[name] = theme as Theme;
    }

    return validatedThemes;
  } catch (error) {
    console.warn(`[llmd] Failed to load custom themes from ${themesPath}:`, error);
    return {};
  }
};

// Combine built-in and custom themes
let allThemes: Record<string, Theme> | null = null;

const getAllThemes = (): Record<string, Theme> => {
  if (!allThemes) {
    const customThemes = loadCustomThemes();
    allThemes = { ...BUILT_IN_THEMES, ...customThemes };
  }
  return allThemes;
};

// Get theme (colors + fonts)
export const getTheme = (themeName: string): Theme => {
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
