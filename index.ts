#!/usr/bin/env bun

// Main entrypoint

import { execSync } from "node:child_process";
import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { openBrowser } from "./src/browser";
import { parseCli } from "./src/cli";
import { disableAnalytics, enableAnalytics, saveThemePreferences } from "./src/events";
import { getRelativePath, scanMarkdownFiles } from "./src/scanner";
import { getServerUrl, startServer } from "./src/server";
import { printSplash } from "./src/splash";

// Side effect: Clone or update llmd repo and launch server
const handleDocsCommand = async (): Promise<void> => {
  const REPO_URL = "https://github.com/pbzona/llmd";

  // Determine data directory (XDG_DATA_HOME or ~/.local/share)
  const xdgDataHome = process.env.XDG_DATA_HOME;
  const dataDir = xdgDataHome || join(homedir(), ".local", "share");
  const docsPath = join(dataDir, "llmd-docs");

  console.log("→ Preparing llmd documentation...\n");

  // Clone if doesn't exist, otherwise use cached
  if (existsSync(docsPath)) {
    console.log(`→ Using cached documentation at ${docsPath}`);
    console.log(`  (Run 'rm -rf "${docsPath}"' to re-clone)\n`);
  } else {
    console.log(`→ Cloning llmd repository to ${docsPath}...`);
    try {
      execSync(`git clone ${REPO_URL} "${docsPath}"`, { stdio: "inherit" });
      console.log("✓ Repository cloned successfully\n");
    } catch (error) {
      throw new Error(
        `Failed to clone repository: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  // Start server with docs path
  const result = parseCli([docsPath, "--open"]);
  if (result.type !== "config") {
    throw new Error("Unexpected result from parseCli");
  }

  const config = result.config;

  // Scan and start server
  const files = await scanMarkdownFiles(config.directory);
  const server = await startServer(config, files);
  const url = getServerUrl(server);

  let initialUrl = url;
  if (config.initialFile) {
    const relativePath = getRelativePath(config.initialFile, config.directory);
    initialUrl = `${url}/view/${relativePath}`;
  }

  console.log(`▸ Server running at ${url}`);
  console.log(`  Theme: ${config.theme}`);
  console.log("\n  Press Ctrl+C to stop\n");

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
};

// Main async function
const main = async () => {
  try {
    // Print splash
    printSplash();
    console.log();

    // Parse CLI arguments
    const result = parseCli(process.argv.slice(2));

    // Handle different result types
    if (result.type === "exit") {
      process.exit(0);
    }

    if (result.type === "analytics-enable") {
      enableAnalytics();
      process.exit(0);
    }

    if (result.type === "analytics-disable") {
      disableAnalytics();
      process.exit(0);
    }

    if (result.type === "docs") {
      await handleDocsCommand();
      process.exit(0);
    }

    // Must be config type
    const config = result.config;

    // Save theme preferences for next time
    saveThemePreferences(config.theme, config.fontTheme);

    // Scan for markdown files
    console.log(`→ Scanning ${config.directory}...`);
    const files = await scanMarkdownFiles(config.directory);
    console.log(`✓ Found ${files.length} markdown file${files.length === 1 ? "" : "s"}\n`);

    // Start server
    const server = await startServer(config, files);
    const url = getServerUrl(server);

    // Determine initial URL (open to specific file or analytics if requested)
    let initialUrl = url;
    if (config.openToAnalytics) {
      initialUrl = `${url}/analytics`;
    } else if (config.initialFile) {
      const relativePath = getRelativePath(config.initialFile, config.directory);
      initialUrl = `${url}/view/${relativePath}`;
    }

    console.log(`▸ Server running at ${url}`);
    console.log(`  Theme: ${config.theme}`);

    if (config.openToAnalytics) {
      console.log("  Opening: Analytics");
    } else if (config.initialFile) {
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
