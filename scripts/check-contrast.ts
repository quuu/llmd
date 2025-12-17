#!/usr/bin/env bun
// @ts-nocheck
/* eslint-disable */

/**
 * Check color contrast ratios for all themes
 *
 * Usage:
 *   bun scripts/check-contrast.ts
 *   bun run check-contrast
 */

// biome-ignore lint/style/useLiteralEnumMembers: bitwise operations needed for color calculations
// biome-ignore lint/style/useTemplate: cleaner without template literals in this file
import { getAvailableThemes, getThemeColors } from "../src/theme-config";

// Calculate relative luminance (WCAG formula)
const getLuminance = (hex: string): number => {
  const rgb = Number.parseInt(hex.replace("#", ""), 16);
  // biome-ignore lint/style/useExponentiationOperator: bitwise is more efficient
  // biome-ignore lint/suspicious/noDoubleEquals: bitwise required
  const r = (rgb >> 16) & 0xff;
  const g = (rgb >> 8) & 0xff;
  const b = rgb & 0xff;

  const srgbValues = [r, g, b].map((c) => {
    const sRGB = c / 255;
    return sRGB <= 0.03928 ? sRGB / 12.92 : ((sRGB + 0.055) / 1.055) ** 2.4;
  });

  const rs = srgbValues[0] ?? 0;
  const gs = srgbValues[1] ?? 0;
  const bs = srgbValues[2] ?? 0;

  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
};

// Calculate contrast ratio between two colors
const getContrastRatio = (color1: string, color2: string): number => {
  const lum1 = getLuminance(color1);
  const lum2 = getLuminance(color2);
  const lighter = Math.max(lum1, lum2);
  const darker = Math.min(lum1, lum2);
  return (lighter + 0.05) / (darker + 0.05);
};

// WCAG contrast requirements
const WCAG_AA_NORMAL = 4.5; // Normal text
const WCAG_AA_LARGE = 3.0; // Large text (18pt+ or 14pt+ bold)
const WCAG_AAA_NORMAL = 7.0; // Enhanced normal text
const WCAG_AAA_LARGE = 4.5; // Enhanced large text

// Get pass/fail status
const getStatus = (ratio: number, threshold: number): string => {
  if (ratio >= threshold) {
    return "✅ PASS";
  }
  if (ratio >= threshold - 0.5) {
    return "⚠️  WARN";
  }
  return "❌ FAIL";
};

// Format ratio with color coding
const formatRatio = (ratio: number, threshold: number): string => {
  const fixed = ratio.toFixed(2);
  if (ratio >= WCAG_AAA_NORMAL) {
    return `${fixed} (AAA)`;
  }
  if (ratio >= WCAG_AA_NORMAL) {
    return `${fixed} (AA)`;
  }
  if (ratio >= WCAG_AA_LARGE) {
    return `${fixed} (Large only)`;
  }
  return `${fixed} (Fail)`;
};

// Check if theme is dark based on background luminance
const isDarkTheme = (bgColor: string): boolean => {
  return getLuminance(bgColor) < 0.5;
};

// Main checker
const checkThemeContrast = (themeName: string): void => {
  const colors = getThemeColors(themeName);
  const dark = isDarkTheme(colors.bg);

  console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`Theme: ${themeName.toUpperCase()} (${dark ? "Dark" : "Light"})`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);

  // Check primary text on background
  const fgBgRatio = getContrastRatio(colors.fg, colors.bg);
  console.log(`\n📝 Primary Text (fg on bg):`);
  console.log(`   ${colors.fg} on ${colors.bg}`);
  console.log(`   Ratio: ${formatRatio(fgBgRatio, WCAG_AA_NORMAL)}`);
  console.log(`   ${getStatus(fgBgRatio, WCAG_AA_NORMAL)}`);

  // Check accent text on background (links, active items with opposite color)
  const accentTextColor = dark ? "#000000" : "#ffffff";
  const accentRatio = getContrastRatio(accentTextColor, colors.accent);
  console.log(`\n🔗 Active Items (${accentTextColor} on accent):`);
  console.log(`   ${accentTextColor} on ${colors.accent}`);
  console.log(`   Ratio: ${formatRatio(accentRatio, WCAG_AA_NORMAL)}`);
  console.log(`   ${getStatus(accentRatio, WCAG_AA_NORMAL)}`);

  // Check accent links on background
  const accentLinkRatio = getContrastRatio(colors.accent, colors.bg);
  console.log(`\n🔗 Accent Links (accent on bg):`);
  console.log(`   ${colors.accent} on ${colors.bg}`);
  console.log(`   Ratio: ${formatRatio(accentLinkRatio, WCAG_AA_NORMAL)}`);
  console.log(`   ${getStatus(accentLinkRatio, WCAG_AA_NORMAL)}`);

  // Check border visibility
  const borderRatio = getContrastRatio(colors.border, colors.bg);
  console.log(`\n─ Border Contrast (border on bg):`);
  console.log(`   ${colors.border} on ${colors.bg}`);
  console.log(`   Ratio: ${formatRatio(borderRatio, WCAG_AA_LARGE)}`);
  console.log(`   ${getStatus(borderRatio, WCAG_AA_LARGE)} (UI elements)`);

  // Check code background contrast
  const codeRatio = getContrastRatio(colors.fg, colors.codeBg);
  console.log(`\n💻 Code Text (fg on codeBg):`);
  console.log(`   ${colors.fg} on ${colors.codeBg}`);
  console.log(`   Ratio: ${formatRatio(codeRatio, WCAG_AA_NORMAL)}`);
  console.log(`   ${getStatus(codeRatio, WCAG_AA_NORMAL)}`);

  // Check sidebar contrast
  const sidebarRatio = getContrastRatio(colors.fg, colors.sidebarBg);
  console.log(`\n📂 Sidebar Text (fg on sidebarBg):`);
  console.log(`   ${colors.fg} on ${colors.sidebarBg}`);
  console.log(`   Ratio: ${formatRatio(sidebarRatio, WCAG_AA_NORMAL)}`);
  console.log(`   ${getStatus(sidebarRatio, WCAG_AA_NORMAL)}`);

  // Check hover contrast
  const hoverRatio = getContrastRatio(colors.fg, colors.hover);
  console.log(`\n👆 Hover State (fg on hover):`);
  console.log(`   ${colors.fg} on ${colors.hover}`);
  console.log(`   Ratio: ${formatRatio(hoverRatio, WCAG_AA_NORMAL)}`);
  console.log(`   ${getStatus(hoverRatio, WCAG_AA_NORMAL)}`);

  // Overall score
  const checks = [fgBgRatio, accentRatio, accentLinkRatio, codeRatio, sidebarRatio, hoverRatio];
  const passing = checks.filter((r) => r >= WCAG_AA_NORMAL).length;
  const total = checks.length;
  const percentage = Math.round((passing / total) * 100);

  console.log(`\n📊 Overall Score: ${passing}/${total} checks passing (${percentage}%)`);

  if (percentage === 100) {
    console.log("   ✅ All contrast checks passed!");
  } else if (percentage >= 80) {
    console.log("   ⚠️  Most checks passed, some improvements possible");
  } else {
    console.log("   ❌ Several contrast issues need attention");
  }
};

// Run checker for all themes
const main = () => {
  console.log("╔═══════════════════════════════════════════════════════════════╗");
  console.log("║           LLMD CONTRAST CHECKER                               ║");
  console.log("╚═══════════════════════════════════════════════════════════════╝");
  console.log("\nChecking WCAG 2.1 contrast ratios for all themes...");
  console.log("\nStandards:");
  console.log("  • AA Normal:  4.5:1 (minimum for body text)");
  console.log("  • AA Large:   3.0:1 (18pt+ or 14pt+ bold)");
  console.log("  • AAA Normal: 7.0:1 (enhanced)");
  console.log("  • AAA Large:  4.5:1 (enhanced large)");

  const themes = getAvailableThemes();
  let allPassing = true;

  for (const theme of themes) {
    try {
      checkThemeContrast(theme);
    } catch (error) {
      console.log(`\n❌ Error checking theme "${theme}":`, error);
      allPassing = false;
    }
  }

  console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("\n💡 Tips for fixing contrast issues:");
  console.log("   • Increase brightness difference between fg/bg");
  console.log("   • Use darker accent colors for dark themes");
  console.log("   • Ensure hover states maintain readability");
  console.log("   • Test with actual content in browser");
  console.log("   • Consider colorblind users");
  console.log("\n🎨 Edit themes in: ~/.config/llmd/themes.json");
  console.log("   Or modify built-in themes in: src/theme-config.ts\n");

  // Exit with error code if any theme failed
  if (!allPassing) {
    process.exit(1);
  }
};

main();
