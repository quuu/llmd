// Font theme definitions and loading

import { existsSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

export type FontTheme = {
  name: string;
  body: string;
  heading: string;
  code: string;
  googleFontsUrl?: string; // Optional Google Fonts CSS import
};

// Built-in font themes
const BUILT_IN_FONT_THEMES: Record<string, FontTheme> = {
  serif: {
    name: "Serif",
    body: "Georgia, 'Times New Roman', Times, serif",
    heading: "Georgia, 'Times New Roman', Times, serif",
    code: '"Courier New", Courier, monospace',
  },
  sans: {
    name: "Sans",
    body: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    heading:
      '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    code: '"SF Mono", Monaco, "Cascadia Code", "Roboto Mono", Consolas, monospace',
  },
  mono: {
    name: "Mono",
    body: '"SF Mono", Monaco, "Cascadia Code", "Roboto Mono", Consolas, monospace',
    heading: '"SF Mono", Monaco, "Cascadia Code", "Roboto Mono", Consolas, monospace',
    code: '"SF Mono", Monaco, "Cascadia Code", "Roboto Mono", Consolas, monospace',
  },
  classic: {
    name: "Classic",
    heading: "Baskerville, 'Libre Baskerville', serif",
    body: "Geist, sans-serif",
    code: '"Geist Mono", monospace',
    googleFontsUrl:
      "https://fonts.googleapis.com/css2?family=Libre+Baskerville:wght@400;700&family=Geist:wght@400;700&family=Geist+Mono:wght@400;700&display=swap",
  },
  future: {
    name: "Future",
    heading: '"Space Mono", monospace',
    body: '"Space Grotesk", sans-serif',
    code: '"Space Mono", monospace',
    googleFontsUrl:
      "https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&family=Space+Grotesk:wght@400;700&display=swap",
  },
  modern: {
    name: "Modern",
    heading: '"Inter", sans-serif',
    body: '"Inter", sans-serif',
    code: '"JetBrains Mono", monospace',
    googleFontsUrl:
      "https://fonts.googleapis.com/css2?family=Inter:wght@400;700&family=JetBrains+Mono:wght@400;700&display=swap",
  },
  artsy: {
    name: "Artsy",
    heading: '"Playfair Display", serif',
    body: '"Fira Code", monospace',
    code: '"Fira Code", monospace',
    googleFontsUrl:
      "https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700&family=Fira+Code:wght@400;700&display=swap",
  },
  literary: {
    name: "Literary",
    heading: "Spectral, serif",
    body: "Newsreader, serif",
    code: '"Geist Mono", monospace',
    googleFontsUrl:
      "https://fonts.googleapis.com/css2?family=Spectral:wght@400;700&family=Newsreader:wght@400;700&family=Geist+Mono:wght@400;700&display=swap",
  },
  editorial: {
    name: "Editorial",
    heading: "Bitter, serif",
    body: "Lora, serif",
    code: '"Geist Mono", monospace',
    googleFontsUrl:
      "https://fonts.googleapis.com/css2?family=Bitter:wght@400;700&family=Lora:wght@400;700&family=Geist+Mono:wght@400;700&display=swap",
  },
};

// Load custom fonts from unified config file
const loadCustomFonts = (): Record<string, FontTheme> => {
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

    // Support both unified config (fontThemes key) and old format (fonts.json)
    const customFonts = config.fontThemes || {};

    // Validate that it's an object with font objects
    if (typeof customFonts !== "object" || customFonts === null) {
      return {};
    }

    // Validate each font has required properties
    const validatedFonts: Record<string, FontTheme> = {};
    for (const [name, font] of Object.entries(customFonts)) {
      if (typeof font !== "object" || font === null) {
        console.warn(`[llmd] Skipping invalid font: ${name}`);
        continue;
      }

      const f = font as Record<string, unknown>;
      const requiredProps = ["body", "heading", "code"];

      const hasAllProps = requiredProps.every((prop) => typeof f[prop] === "string");
      if (!hasAllProps) {
        console.warn(`[llmd] Skipping incomplete font: ${name}`);
        continue;
      }

      // Validate googleFontsUrl if present
      if (f.googleFontsUrl !== undefined && typeof f.googleFontsUrl !== "string") {
        console.warn(`[llmd] Skipping font with invalid googleFontsUrl: ${name}`);
        continue;
      }

      validatedFonts[name] = {
        name: name.charAt(0).toUpperCase() + name.slice(1),
        body: f.body as string,
        heading: f.heading as string,
        code: f.code as string,
        googleFontsUrl: f.googleFontsUrl as string | undefined,
      };
    }

    return validatedFonts;
  } catch (error) {
    console.warn(`[llmd] Failed to load custom fonts from ${themesPath}:`, error);
    return {};
  }
};

// Combine built-in and custom fonts
let allFonts: Record<string, FontTheme> | null = null;

const getAllFonts = (): Record<string, FontTheme> => {
  if (!allFonts) {
    const customFonts = loadCustomFonts();
    allFonts = { ...BUILT_IN_FONT_THEMES, ...customFonts };
  }
  return allFonts;
};

// Helper: Extract font family name from CSS font-family string
const extractFontFamily = (fontFamilyString: string): string | null => {
  // Remove fallback fonts and get the first font
  // e.g., "Roboto, sans-serif" -> "Roboto"
  // e.g., '"Space Mono", monospace' -> "Space Mono"
  const firstFont = fontFamilyString.split(",")[0]?.trim();
  if (!firstFont) {
    return null;
  }

  // Remove quotes
  return firstFont.replace(/['"]/g, "");
};

// Helper: Check if font is a system font (doesn't need Google Fonts)
const isSystemFont = (fontFamily: string): boolean => {
  const systemFonts = [
    "system-ui",
    "-apple-system",
    "BlinkMacSystemFont",
    "Segoe UI",
    "Helvetica Neue",
    "Arial",
    "sans-serif",
    "serif",
    "monospace",
    "Georgia",
    "Times New Roman",
    "Times",
    "Courier New",
    "Courier",
    "SF Mono",
    "Monaco",
    "Cascadia Code",
    "Consolas",
  ];

  const lower = fontFamily.toLowerCase();
  return systemFonts.some((sf) => lower.includes(sf.toLowerCase()));
};

// Helper: Generate Google Fonts URL from font families
const generateGoogleFontsUrl = (heading: string, body: string, code: string): string | null => {
  const fonts = new Set<string>();

  // Extract font families
  const fontStrings = [heading, body, code];
  for (const fontStr of fontStrings) {
    const fontFamily = extractFontFamily(fontStr);
    if (fontFamily && !isSystemFont(fontFamily)) {
      fonts.add(fontFamily);
    }
  }

  if (fonts.size === 0) {
    return null; // All system fonts
  }

  // Build Google Fonts URL
  const fontParams = Array.from(fonts)
    .map((font) => `family=${font.replace(/ /g, "+")}:wght@400;700`)
    .join("&");

  return `https://fonts.googleapis.com/css2?${fontParams}&display=swap`;
};

// Generate font import link tag for Google Fonts
export const generateFontImport = (fontName: string): string => {
  const fonts = getAllFonts();
  const font = fonts[fontName];

  if (!font) {
    return "";
  }

  // Use provided googleFontsUrl or auto-generate it
  const googleFontsUrl =
    font.googleFontsUrl || generateGoogleFontsUrl(font.heading, font.body, font.code);

  if (!googleFontsUrl) {
    return ""; // System fonts only
  }

  return `<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="${googleFontsUrl}" rel="stylesheet">`;
};

// Get font families for CSS
export const getFontFamilies = (
  fontName: string
): { body: string; heading: string; code: string } => {
  const fonts = getAllFonts();
  const font = fonts[fontName] || fonts.sans;

  if (!font) {
    throw new Error(
      `Font "${fontName}" not found. Available fonts: ${Object.keys(fonts).join(", ")}`
    );
  }

  return {
    body: font.body,
    heading: font.heading,
    code: font.code,
  };
};

// Get list of available font names
export const getAvailableFonts = (): string[] => Object.keys(getAllFonts());

// Check if a font exists
export const fontExists = (fontName: string): boolean => fontName in getAllFonts();
