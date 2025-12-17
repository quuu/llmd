import { describe, expect, test } from "bun:test";
import { fontExists, generateFontImport, getAvailableFonts, getFontFamilies } from "./font-themes";

// Regex for matching font URL patterns
const FONT_WEIGHT_PATTERN = /family=[^&]+:wght@400;700/;

describe("Font Themes", () => {
  describe("Built-in fonts", () => {
    test("should have all built-in fonts available", () => {
      const fonts = getAvailableFonts();
      expect(fonts).toContain("serif");
      expect(fonts).toContain("sans");
      expect(fonts).toContain("mono");
      expect(fonts).toContain("classic");
      expect(fonts).toContain("future");
      expect(fonts).toContain("modern");
      expect(fonts).toContain("artsy");
      expect(fonts).toContain("literary");
      expect(fonts).toContain("editorial");
    });

    test("should check font existence", () => {
      expect(fontExists("sans")).toBe(true);
      expect(fontExists("modern")).toBe(true);
      expect(fontExists("nonexistent")).toBe(false);
    });

    test("should get font families for built-in fonts", () => {
      const sans = getFontFamilies("sans");
      expect(sans.body).toContain("system");
      expect(sans.heading).toContain("system");
      expect(sans.code).toContain("Monaco");

      const modern = getFontFamilies("modern");
      expect(modern.heading).toContain("Inter");
      expect(modern.body).toContain("Inter");
      expect(modern.code).toContain("JetBrains Mono");
    });

    test("should default to sans for unknown fonts", () => {
      const fallback = getFontFamilies("nonexistent");
      const sans = getFontFamilies("sans");
      expect(fallback).toEqual(sans);
    });
  });

  describe("Google Fonts Import Generation", () => {
    test("should generate Google Fonts import for fonts that need it", () => {
      const modernImport = generateFontImport("modern");
      expect(modernImport).toContain("fonts.googleapis.com");
      expect(modernImport).toContain("Inter");
      expect(modernImport).toContain("JetBrains+Mono");
      expect(modernImport).toContain("preconnect");
    });

    test("should not generate import for system fonts", () => {
      const serifImport = generateFontImport("serif");
      expect(serifImport).toBe("");

      const sansImport = generateFontImport("sans");
      expect(sansImport).toBe("");

      const monoImport = generateFontImport("mono");
      expect(monoImport).toBe("");
    });

    test("should generate import for Google Fonts with proper format", () => {
      const classicImport = generateFontImport("classic");
      expect(classicImport).toContain('<link rel="preconnect"');
      expect(classicImport).toContain("fonts.googleapis.com");
      expect(classicImport).toContain("fonts.gstatic.com");
      expect(classicImport).toContain("crossorigin");
      expect(classicImport).toContain('rel="stylesheet"');
    });

    test("should include font weights in generated URLs", () => {
      const futureImport = generateFontImport("future");
      expect(futureImport).toContain("wght@400;700");
    });

    test("should handle nonexistent fonts gracefully", () => {
      const noImport = generateFontImport("nonexistent-font");
      expect(noImport).toBe("");
    });
  });

  describe("Font Auto-Generation", () => {
    test("should auto-generate URLs for Google Fonts", () => {
      // This test verifies the auto-generation logic works
      // by checking that fonts without explicit googleFontsUrl still get imports
      const modernImport = generateFontImport("modern");

      // Should contain the font families
      expect(modernImport).toContain("Inter");
      expect(modernImport).toContain("JetBrains");

      // Should have proper Google Fonts URL structure
      expect(modernImport).toMatch(FONT_WEIGHT_PATTERN);
      expect(modernImport).toContain("display=swap");
    });

    test("should optimize by removing system fonts from Google Fonts URL", () => {
      // If we have a mix of system and Google fonts,
      // only Google fonts should be in the URL
      const sansImport = generateFontImport("sans");
      // Sans uses system fonts only, should not generate import
      expect(sansImport).toBe("");
    });

    test("should combine multiple unique fonts in one URL", () => {
      const literaryImport = generateFontImport("literary");
      // Literary uses: Spectral (heading), Newsreader (body), Geist Mono (code)
      expect(literaryImport).toContain("Spectral");
      expect(literaryImport).toContain("Newsreader");
      expect(literaryImport).toContain("Geist");
    });
  });

  describe("Edge Cases", () => {
    test("should handle empty font name", () => {
      const families = getFontFamilies("");
      // Should fallback to sans
      expect(families.body).toContain("system");
    });

    test("should handle fonts with special characters in URL", () => {
      const futureImport = generateFontImport("future");
      // "Space Mono" should be encoded as "Space+Mono"
      expect(futureImport).toContain("Space+Mono");
      expect(futureImport).toContain("Space+Grotesk");
    });

    test("should deduplicate fonts used in multiple positions", () => {
      // Modern uses Inter for both heading and body
      const modernImport = generateFontImport("modern");
      // Should only appear once in URL
      const matches = modernImport.match(/Inter/g);
      expect(matches?.length).toBe(1);
    });
  });
});
