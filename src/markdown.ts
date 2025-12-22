// Markdown parsing and rendering (functional style)

import { marked } from "marked";
import { highlightCode } from "./highlighter";

// Configure marked for GFM
marked.setOptions({
  gfm: true,
  breaks: false,
});

// Regex for heading detection (moved to top level for performance)
const HEADING_REGEX = /^(#{1,6})\s+(.+)$/;

// Pure function: extract headings from markdown for TOC
export const extractHeadings = (
  markdown: string
): Array<{ level: number; text: string; id: string }> => {
  const headings: Array<{ level: number; text: string; id: string }> = [];
  const lines = markdown.split("\n");
  let inCodeBlock = false;

  for (const line of lines) {
    // Track code fence boundaries (``` or ~~~)
    if (line.trim().startsWith("```") || line.trim().startsWith("~~~")) {
      inCodeBlock = !inCodeBlock;
      continue;
    }

    // Skip lines inside code blocks
    if (inCodeBlock) {
      continue;
    }

    const match = line.match(HEADING_REGEX);
    if (match) {
      const level = match[1]!.length;
      const text = match[2]!.trim();
      const id = text
        .toLowerCase()
        .replace(/[^\w\s-]/g, "")
        .replace(/\s+/g, "-");

      headings.push({ level, text, id });
    }
  }

  return headings;
};

// Pure function: rewrite relative markdown links to /view/ URLs
const rewriteMarkdownLinks = (markdown: string): string => {
  // Match markdown links: [text](./path.md) or [text](path.md)
  return markdown.replace(
    /\[([^\]]+)\]\((?:\.\/)?([^)]+\.md)\)/g,
    (_, text, path) => `[${text}](/view/${path})`
  );
};

// Pure function: render markdown to HTML
export const renderMarkdown = (markdown: string): string => {
  const rewritten = rewriteMarkdownLinks(markdown);
  const html = marked.parse(rewritten) as string;
  return html;
};

// Pure function: generate table of contents HTML from headings
export const generateTOC = (
  headings: Array<{ level: number; text: string; id: string }>
): string => {
  if (headings.length === 0) {
    return "";
  }

  const items = headings
    .map((h) => `<li class="toc-level-${h.level}"><a href="#${h.id}">${h.text}</a></li>`)
    .join("\n");

  return `<nav class="toc collapsed"><h3>Contents</h3><ul>${items}</ul></nav>`;
};

// Pure function: add IDs to headings in HTML
export const addHeadingIds = (html: string): string =>
  html.replace(/<h([1-6])>(.+?)<\/h\1>/g, (_, level, text) => {
    const id = text
      .toLowerCase()
      .replace(/[^\w\s-]/g, "")
      .replace(/\s+/g, "-");
    return `<h${level} id="${id}">${text}</h${level}>`;
  });

// Function: apply syntax highlighting to code blocks in HTML
const applySyntaxHighlighting = async (html: string, theme: "light" | "dark"): Promise<string> => {
  // Find all code blocks: <pre><code class="language-X">...</code></pre>
  const codeBlockRegex = /<pre><code(?:\s+class="language-(\w+)")?>([\s\S]*?)<\/code><\/pre>/g;

  const matches = Array.from(html.matchAll(codeBlockRegex));
  let result = html;

  // Process each code block
  for (const match of matches) {
    const [fullMatch, lang, code] = match;
    if (!(fullMatch && code)) {
      continue;
    }

    // Decode HTML entities in code
    const decodedCode = code
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&amp;/g, "&")
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'");

    // Highlight the code
    const highlighted = await highlightCode(decodedCode, lang, theme);

    // Replace in HTML
    result = result.replace(fullMatch, highlighted);
  }

  return result;
};

// Combined function: full markdown processing pipeline
export const processMarkdown = async (
  markdown: string,
  codeTheme?: string
): Promise<{ html: string; toc: string }> => {
  const headings = extractHeadings(markdown);
  const rawHtml = renderMarkdown(markdown);
  const htmlWithIds = addHeadingIds(rawHtml);
  const htmlWithHighlighting = await applySyntaxHighlighting(htmlWithIds, codeTheme);
  const toc = generateTOC(headings);

  return { html: htmlWithHighlighting, toc };
};
