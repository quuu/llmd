// Tests for server request handling

import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { initEventService } from "./events";
import type { Config } from "./types";

// Test fixture directory
const TEST_DIR = join(import.meta.dir, "../test-fixtures/server-test");
const TEST_DB = join(TEST_DIR, "test.db");

// Helper: create test config
const createTestConfig = (directory: string): Config => ({
  directory,
  port: 0,
  theme: "dark",
  open: false,
  watch: false,
});

// Helper: setup test directory with markdown files
const setupTestDirectory = (): void => {
  // Clean up if exists
  if (existsSync(TEST_DIR)) {
    rmSync(TEST_DIR, { recursive: true, force: true });
  }

  // Create test structure
  mkdirSync(TEST_DIR, { recursive: true });
  mkdirSync(join(TEST_DIR, "docs"), { recursive: true });

  // Create test markdown files
  writeFileSync(join(TEST_DIR, "README.md"), "# Test README");
  writeFileSync(join(TEST_DIR, "docs", "guide.md"), "# Guide");
};

// Helper: cleanup test directory
const cleanupTestDirectory = (): void => {
  if (existsSync(TEST_DIR)) {
    rmSync(TEST_DIR, { recursive: true, force: true });
  }
};

describe("Server - Event Tracking", () => {
  beforeEach(() => {
    setupTestDirectory();
  });

  afterEach(() => {
    cleanupTestDirectory();
  });

  test("generateMarkdownPage should include currentPath in tracking script", async () => {
    const { generateMarkdownPage } = await import("./template");
    const config = createTestConfig(TEST_DIR);

    const html = generateMarkdownPage({
      html: "<p>Test content</p>",
      toc: "",
      fileName: "guide.md",
      files: [{ path: "docs/guide.md", name: "guide.md", depth: 1 }],
      config,
      currentPath: "docs/guide.md",
      clientScript: "",
    });

    // Check that the tracking script includes the full path (not undefined)
    expect(html).toContain("trackFileView");
    expect(html).toContain(`${TEST_DIR}/docs/guide.md`);
    expect(html).not.toContain("undefined");
  });

  test("event service should not record paths with undefined", async () => {
    const config = createTestConfig(TEST_DIR);
    const eventService = initEventService(config, TEST_DB);

    if (!eventService) {
      throw new Error("Event service failed to initialize");
    }

    try {
      // Record an event with a proper path
      const filePath = join(TEST_DIR, "docs", "guide.md");
      eventService.recordEvent("view", filePath, "file");

      // Wait a bit for async processing
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Get analytics
      const analytics = await eventService.getAnalytics(TEST_DIR);

      // Check that no paths contain "undefined"
      for (const doc of analytics.mostViewed) {
        expect(doc.path).not.toContain("undefined");
        expect(doc.name).not.toBe("undefined");
      }

      // Verify the correct path was recorded
      expect(analytics.mostViewed.length).toBeGreaterThan(0);
      expect(analytics.mostViewed[0]?.path).toBe(filePath);
      expect(analytics.mostViewed[0]?.name).toBe("guide.md");
    } finally {
      eventService.close();
    }
  });

  test("analytics should show proper document names, not undefined", async () => {
    const config = createTestConfig(TEST_DIR);
    const eventService = initEventService(config, TEST_DB);

    if (!eventService) {
      throw new Error("Event service failed to initialize");
    }

    try {
      // Record events for multiple files
      eventService.recordEvent("view", join(TEST_DIR, "README.md"), "file");
      eventService.recordEvent("view", join(TEST_DIR, "docs", "guide.md"), "file");
      eventService.recordEvent("view", join(TEST_DIR, "docs", "guide.md"), "file");

      // Wait for async processing
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Get analytics
      const analytics = await eventService.getAnalytics(TEST_DIR);

      // Verify all documents have proper names
      expect(analytics.mostViewed.length).toBe(2);
      expect(analytics.mostViewed[0]?.name).toBe("guide.md");
      expect(analytics.mostViewed[0]?.views).toBe(2);
      expect(analytics.mostViewed[1]?.name).toBe("README.md");
      expect(analytics.mostViewed[1]?.views).toBe(1);

      // Ensure no undefined names
      for (const doc of analytics.mostViewed) {
        expect(doc.name).not.toBe("undefined");
      }
    } finally {
      eventService.close();
    }
  });
});
