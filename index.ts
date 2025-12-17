#!/usr/bin/env bun

// Main entrypoint

import { openBrowser } from "./src/browser";
import { parseCli } from "./src/cli";
import { getRelativePath, scanMarkdownFiles } from "./src/scanner";
import { getServerUrl, startServer } from "./src/server";
import { printSplash } from "./src/splash";

// Main async function
const main = async () => {
  try {
    // Print splash
    printSplash();
    console.log();

    // Parse CLI arguments
    const config = parseCli(process.argv.slice(2));

    // Exit early for --help or --version
    if (!config) {
      process.exit(0);
    }

    // Scan for markdown files
    console.log(`→ Scanning ${config.directory}...`);
    const files = await scanMarkdownFiles(config.directory);
    console.log(`✓ Found ${files.length} markdown file${files.length === 1 ? "" : "s"}\n`);

    // Start server
    const server = await startServer(config, files);
    const url = getServerUrl(server);

    // Determine initial URL (open to specific file if provided)
    let initialUrl = url;
    if (config.initialFile) {
      const relativePath = getRelativePath(config.initialFile, config.directory);
      initialUrl = `${url}/view/${relativePath}`;
    }

    console.log(`▸ Server running at ${url}`);
    console.log(`  Theme: ${config.theme}`);

    if (config.initialFile) {
      const relativePath = getRelativePath(config.initialFile, config.directory);
      console.log(`  Opening: ${relativePath}`);
    }

    console.log("\n  Press Ctrl+C to stop\n");

    // Open browser if requested (with a small delay to let server fully start)
    if (config.open) {
      await new Promise((resolve) => setTimeout(resolve, 300));
      openBrowser(initialUrl);
    }

    // Handle graceful shutdown
    process.on("SIGINT", () => {
      console.log("\n\n✓ Shutting down...");
      server.stop();
      process.exit(0);
    });
  } catch (error) {
    if (error instanceof Error) {
      console.error(`\n✗ Error: ${error.message}\n`);
    } else {
      console.error("\n✗ Unknown error occurred\n");
    }
    process.exit(1);
  }
};

// Run main
main();
