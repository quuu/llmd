// Performance benchmark runner

import { join } from "node:path";
import { processMarkdown } from "../src/markdown";
import { scanMarkdownFiles } from "../src/scanner";

type BenchmarkResult = {
  name: string;
  duration: number; // milliseconds
  filesCount?: number;
  avgPerFile?: number;
};

// Pure execution time
const measureTime = async <T>(fn: () => Promise<T>): Promise<{ result: T; duration: number }> => {
  const start = performance.now();
  const result = await fn();
  const end = performance.now();
  return { result, duration: end - start };
};

// Benchmark: File scanning
const benchmarkScanning = async (dir: string): Promise<BenchmarkResult> => {
  const { result, duration } = await measureTime(() => scanMarkdownFiles(dir));

  return {
    name: "File Scanning",
    duration,
    filesCount: result.length,
    avgPerFile: result.length > 0 ? duration / result.length : 0,
  };
};

// Benchmark: Markdown rendering
const benchmarkRendering = async (
  markdown: string,
  theme: "light" | "dark" = "light"
): Promise<BenchmarkResult> => {
  const codeTheme = theme === "light" ? "github-light" : "github-dark";
  const { duration } = await measureTime(() => processMarkdown(markdown, codeTheme));

  return {
    name: "Markdown Rendering",
    duration,
  };
};

// Generate test markdown with varying complexity
const generateTestMarkdown = (complexity: "simple" | "medium" | "complex"): string => {
  const simple =
    "# Simple Test\n\nJust a paragraph with [a link](./other.md).\n\n## Section\n\nAnother paragraph.";

  const medium = `# Medium Test\n\n${new Array(10)
    .fill(0)
    .map(
      (_, i) =>
        `## Section ${i}\n\nParagraph with **bold** and *italic* text.\n\n\`\`\`typescript\nconst x = ${i};\n\`\`\`\n`
    )
    .join("\n")}`;

  const complex = `# Complex Test\n\n${new Array(50)
    .fill(0)
    .map(
      (_, i) =>
        `## Section ${i}\n\nParagraph with **bold**, *italic*, and [links](./file${i}.md).\n\n| Col A | Col B |\n|-------|-------|\n| ${i} | Data |\n\n\`\`\`typescript\nconst value = ${i};\nconsole.log(value);\n\`\`\`\n`
    )
    .join("\n")}`;

  return { simple, medium, complex }[complexity];
};

// Main benchmark suite
const runBenchmarks = async () => {
  console.log("📊 Running llmd Performance Benchmarks\n");

  const results: BenchmarkResult[] = [];

  // 1. Scanning benchmarks
  console.log("1️⃣  Scanning Performance:");

  const fixturesDir = join(import.meta.dir, "../test-fixtures/docs");
  const scanResult = await benchmarkScanning(fixturesDir);
  results.push(scanResult);
  console.log(`   Files found: ${scanResult.filesCount}`);
  console.log(`   Total time: ${scanResult.duration.toFixed(2)}ms`);
  console.log(`   Avg per file: ${scanResult.avgPerFile?.toFixed(2)}ms\n`);

  // 2. Rendering benchmarks
  console.log("2️⃣  Rendering Performance:");

  for (const complexity of ["simple", "medium", "complex"] as const) {
    const markdown = generateTestMarkdown(complexity);
    const renderResult = await benchmarkRendering(markdown);
    results.push({
      name: `Rendering (${complexity})`,
      duration: renderResult.duration,
    });
    console.log(`   ${complexity.padEnd(8)}: ${renderResult.duration.toFixed(2)}ms`);
  }

  console.log();

  // 3. Summary
  console.log("📈 Summary:");
  console.log(`   Total benchmarks: ${results.length}`);
  console.log(`   Total time: ${results.reduce((sum, r) => sum + r.duration, 0).toFixed(2)}ms`);

  // Output as JSON for CI
  const output = {
    timestamp: new Date().toISOString(),
    results,
    summary: {
      totalBenchmarks: results.length,
      totalTime: results.reduce((sum, r) => sum + r.duration, 0),
    },
  };

  await Bun.write(join(import.meta.dir, "results.json"), JSON.stringify(output, null, 2));
  console.log("\n✓ Results saved to benchmarks/results.json");
};

// Run benchmarks
runBenchmarks().catch((error) => {
  console.error("Benchmark failed:", error);
  process.exit(1);
});
