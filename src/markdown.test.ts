import { describe, expect, test } from "bun:test";
import {
  addHeadingIds,
  extractHeadings,
  generateTOC,
  processMarkdown,
  renderMarkdown,
} from "./markdown";

describe("extractHeadings", () => {
  test("extracts headings from markdown", () => {
    const markdown = "# Title\n## Subtitle\n### Section";
    const headings = extractHeadings(markdown);

    expect(headings.length).toBe(3);
    expect(headings[0]?.text).toBe("Title");
    expect(headings[1]?.text).toBe("Subtitle");
    expect(headings[2]?.text).toBe("Section");
  });

  test("generates slugified IDs", () => {
    const markdown = "# Hello World\n## API Reference";
    const headings = extractHeadings(markdown);

    expect(headings[0]?.id).toBe("hello-world");
    expect(headings[1]?.id).toBe("api-reference");
  });

  test("handles empty markdown", () => {
    const headings = extractHeadings("");
    expect(headings.length).toBe(0);
  });

  test("ignores hash comments inside code blocks", () => {
    const markdown = `# Real Heading

\`\`\`bash
# This is a comment, not a heading
echo "test"
\`\`\`

## Another Real Heading`;
    const headings = extractHeadings(markdown);

    expect(headings.length).toBe(2);
    expect(headings[0]?.text).toBe("Real Heading");
    expect(headings[1]?.text).toBe("Another Real Heading");
  });

  test("ignores multiple hash comments in code blocks", () => {
    const markdown = `# Title

\`\`\`python
# Comment 1
def foo():
    # Comment 2
    pass
\`\`\`

## Section`;
    const headings = extractHeadings(markdown);

    expect(headings.length).toBe(2);
    expect(headings[0]?.text).toBe("Title");
    expect(headings[1]?.text).toBe("Section");
  });
});

describe("renderMarkdown", () => {
  test("renders basic markdown to HTML", () => {
    const markdown = "# Title\n\nParagraph text.";
    const html = renderMarkdown(markdown);

    expect(html).toContain("<h1>");
    expect(html).toContain("Title");
    expect(html).toContain("<p>");
  });

  test("rewrites relative markdown links", () => {
    const markdown = "[Link](./other.md)";
    const html = renderMarkdown(markdown);

    expect(html).toContain("/view/other.md");
  });

  test("rewrites markdown links without leading ./", () => {
    const markdown = "[Link](other.md)";
    const html = renderMarkdown(markdown);

    expect(html).toContain("/view/other.md");
  });

  test("preserves external links", () => {
    const markdown = "[Google](https://google.com)";
    const html = renderMarkdown(markdown);

    expect(html).toContain("https://google.com");
  });

  test("renders code blocks", () => {
    const markdown = "```js\nconst x = 1;\n```";
    const html = renderMarkdown(markdown);

    expect(html).toContain("<pre>");
    expect(html).toContain("const x = 1;");
  });

  test("renders tables (GFM)", () => {
    const markdown = "| A | B |\n|---|---|\n| 1 | 2 |";
    const html = renderMarkdown(markdown);

    expect(html).toContain("<table>");
  });
});

describe("generateTOC", () => {
  test("generates TOC from headings", () => {
    const headings = [
      { level: 1, text: "Title", id: "title" },
      { level: 2, text: "Section", id: "section" },
    ];
    const toc = generateTOC(headings);

    expect(toc).toContain("Contents");
    expect(toc).toContain("Title");
    expect(toc).toContain("Section");
    expect(toc).toContain("#title");
  });

  test("returns empty string for no headings", () => {
    const toc = generateTOC([]);
    expect(toc).toBe("");
  });
});

describe("addHeadingIds", () => {
  test("adds IDs to HTML headings", () => {
    const html = "<h1>Hello World</h1><h2>API</h2>";
    const result = addHeadingIds(html);

    expect(result).toContain('id="hello-world"');
    expect(result).toContain('id="api"');
  });
});

describe("processMarkdown", () => {
  test("returns HTML and TOC", async () => {
    const markdown = "# Title\n\nSome text.";
    const { html, toc } = await processMarkdown(markdown, "light");

    expect(html).toContain("<h1");
    expect(html).toContain("Title");
    expect(toc).toContain("Contents");
  });

  test("integrates link rewriting", async () => {
    const markdown = "[Link](./file.md)";
    const { html } = await processMarkdown(markdown, "light");

    expect(html).toContain("/view/file.md");
  });
});
