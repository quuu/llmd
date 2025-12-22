// Syntax highlighting with Shiki
import { createHighlighterCore, type HighlighterCore } from "shiki/core";
import { createJavaScriptRegexEngine } from "shiki/engine/javascript";

// Import only specific language grammars we need
import bash from "shiki/langs/bash.mjs";
import css from "shiki/langs/css.mjs";
import dockerfile from "shiki/langs/dockerfile.mjs";
import go from "shiki/langs/go.mjs";
import html from "shiki/langs/html.mjs";
import javascript from "shiki/langs/javascript.mjs";
import json from "shiki/langs/json.mjs";
import jsx from "shiki/langs/jsx.mjs";
import markdown from "shiki/langs/markdown.mjs";
import python from "shiki/langs/python.mjs";
import ruby from "shiki/langs/ruby.mjs";
import rust from "shiki/langs/rust.mjs";
import shell from "shiki/langs/shellscript.mjs";
import sql from "shiki/langs/sql.mjs";
import toml from "shiki/langs/toml.mjs";
import tsx from "shiki/langs/tsx.mjs";
import typescript from "shiki/langs/typescript.mjs";
import xml from "shiki/langs/xml.mjs";
import yaml from "shiki/langs/yaml.mjs";

// Lazy-initialized highlighter singleton
let highlighter: HighlighterCore | null = null;

// Track loaded themes to avoid reloading
const loadedThemes = new Set<string>();

// Pure function: dynamically import a theme
// biome-ignore lint/suspicious/noExplicitAny: Shiki theme type compatibility
const loadTheme = async (themeName: string): Promise<any> => {
  switch (themeName) {
    case "github-dark":
      return (await import("shiki/themes/github-dark.mjs")).default;
    case "github-light":
      return (await import("shiki/themes/github-light.mjs")).default;
    case "nord":
      return (await import("shiki/themes/nord.mjs")).default;
    case "dracula":
      return (await import("shiki/themes/dracula.mjs")).default;
    case "monokai":
      return (await import("shiki/themes/monokai.mjs")).default;
    case "solarized-dark":
      return (await import("shiki/themes/solarized-dark.mjs")).default;
    case "solarized-light":
      return (await import("shiki/themes/solarized-light.mjs")).default;
    default:
      return (await import("shiki/themes/github-dark.mjs")).default;
  }
};

// Map of language names to their grammar modules (these are arrays)
const languageModules = {
  javascript,
  typescript,
  jsx,
  tsx,
  json,
  html,
  css,
  python,
  rust,
  go,
  ruby,
  bash,
  shell,
  sql,
  yaml,
  toml,
  markdown,
  xml,
  dockerfile,
};

// Initialize highlighter with only the languages we need
// biome-ignore lint/suspicious/noExplicitAny: Shiki theme type compatibility
const getHighlighter = async (themeName: string): Promise<HighlighterCore> => {
  if (!highlighter) {
    // Flatten all language arrays into single array
    const allLangs = Object.values(languageModules).flat();

    // Load the initial theme
    const theme = await loadTheme(themeName);

    highlighter = await createHighlighterCore({
      langs: allLangs,
      themes: [theme as any],
      engine: createJavaScriptRegexEngine(),
    });

    loadedThemes.add(themeName);
  } else if (!loadedThemes.has(themeName)) {
    // Load additional theme if not already loaded
    const theme = await loadTheme(themeName);
    await highlighter.loadTheme(theme as any);
    loadedThemes.add(themeName);
  }

  return highlighter;
};

type SupportedLanguage = keyof typeof languageModules;

// Pure function: detect language from code fence or auto-detect
const detectLanguage = (lang: string | undefined): SupportedLanguage | "plaintext" => {
  if (!lang) {
    return "plaintext";
  }

  // Normalize common aliases
  const langLower = lang.toLowerCase();
  const aliases: Record<string, SupportedLanguage> = {
    js: "javascript",
    ts: "typescript",
    py: "python",
    sh: "bash",
    yml: "yaml",
    rs: "rust",
    rb: "ruby",
    cs: "csharp",
    "c++": "cpp",
  };

  const normalized = aliases[langLower] || langLower;

  // Check if it's a supported language
  return normalized in languageModules ? (normalized as SupportedLanguage) : "plaintext";
};

// Pure function: highlight code with Shiki
export const highlightCode = async (
  code: string,
  lang: string | undefined,
  codeTheme?: string
): Promise<string> => {
  try {
    const language = detectLanguage(lang);
    // Use provided codeTheme or fallback to github-dark
    const shikiTheme = codeTheme || "github-dark";

    // Get highlighter instance (lazy-loaded with theme)
    const hl = await getHighlighter(shikiTheme);

    // Use highlighter's codeToHtml method
    const htmlOutput = hl.codeToHtml(code, {
      lang: language,
      theme: shikiTheme,
    });

    return htmlOutput;
  } catch (error) {
    console.error("Syntax highlighting failed:", error);
    // Fallback to plain text
    const escaped = code.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    return `<pre><code>${escaped}</code></pre>`;
  }
};
