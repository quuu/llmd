// Tests for event tracking service

import { beforeEach, describe, expect, test } from "bun:test";
import { existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { initEventService } from "./events";
import type { Config } from "./types";

// Test fixture directory
const TEST_DIR = join(import.meta.dir, "../test-fixtures/events-test");

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
  mkdirSync(join(TEST_DIR, "node_modules"), { recursive: true });

  // Create test markdown files
  writeFileSync(join(TEST_DIR, "README.md"), "# Test");
  writeFileSync(join(TEST_DIR, "docs", "guide.md"), "# Guide");
  writeFileSync(join(TEST_DIR, "docs", "api.md"), "# API");
  writeFileSync(join(TEST_DIR, "node_modules", "ignored.md"), "# Ignored");
};

// Helper: cleanup test directory
const cleanupTestDirectory = (): void => {
  if (existsSync(TEST_DIR)) {
    rmSync(TEST_DIR, { recursive: true, force: true });
  }
};

describe("Event Service", () => {
  beforeEach(() => {
    setupTestDirectory();
  });

  test("should initialize by default when LLMD_ENABLE_EVENTS is not set (opt-out)", () => {
    // Events are enabled by default (opt-out)
    process.env.LLMD_ENABLE_EVENTS = undefined;
    const config = createTestConfig(TEST_DIR);
    const service = initEventService(config, ":memory:");

    expect(service).not.toBeNull();
    service?.close();

    process.env.LLMD_ENABLE_EVENTS = undefined;
    cleanupTestDirectory();
  });

  test("should initialize database and scan resources", async () => {
    process.env.LLMD_ENABLE_EVENTS = "1";
    const config = createTestConfig(TEST_DIR);
    const service = initEventService(config, ":memory:");

    expect(service).not.toBeNull();

    // Wait for scanning to complete
    await new Promise((resolve) => setTimeout(resolve, 1000));

    const analytics = await service!.getAnalytics();

    // Should have root dir + docs subdir + 3 markdown files (excluding node_modules)
    expect(analytics.totalResources).toBeGreaterThanOrEqual(5);
    expect(analytics.totalEvents).toBe(0); // No events recorded yet
    expect(analytics.zeroViews).toHaveLength(3); // All 3 files unviewed

    service!.close();
    cleanupTestDirectory();
  });

  test("should record view events", async () => {
    process.env.LLMD_ENABLE_EVENTS = "1";
    const config = createTestConfig(TEST_DIR);
    const service = initEventService(config, ":memory:");

    // Wait for scanning
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Record view event
    const filePath = join(TEST_DIR, "README.md");
    service!.recordEvent("view", filePath, "file");

    // Give it a moment to process
    await new Promise((resolve) => setTimeout(resolve, 100));

    const analytics = await service!.getAnalytics();

    expect(analytics.totalEvents).toBe(1); // Just the view event
    expect(analytics.mostViewed).toHaveLength(1);
    expect(analytics.mostViewed[0]?.name).toBe("README.md");
    expect(analytics.mostViewed[0]?.views).toBe(1);
    expect(analytics.zeroViews).toHaveLength(2); // 2 files still unviewed

    service!.close();
    cleanupTestDirectory();
  });

  test("should track multiple views of same file", async () => {
    process.env.LLMD_ENABLE_EVENTS = "1";
    const config = createTestConfig(TEST_DIR);
    const service = initEventService(config, ":memory:");

    await new Promise((resolve) => setTimeout(resolve, 1000));

    const filePath = join(TEST_DIR, "README.md");

    // Record multiple views
    service!.recordEvent("view", filePath, "file");
    service!.recordEvent("view", filePath, "file");
    service!.recordEvent("view", filePath, "file");

    await new Promise((resolve) => setTimeout(resolve, 100));

    const analytics = await service!.getAnalytics();

    expect(analytics.mostViewed[0]?.views).toBe(3);

    service!.close();
    cleanupTestDirectory();
  });

  test("should get activity time series", async () => {
    process.env.LLMD_ENABLE_EVENTS = "1";
    const config = createTestConfig(TEST_DIR);
    const service = initEventService(config, ":memory:");

    await new Promise((resolve) => setTimeout(resolve, 1000));

    const filePath = join(TEST_DIR, "README.md");
    service!.recordEvent("view", filePath, "file");

    await new Promise((resolve) => setTimeout(resolve, 100));

    const timeSeries = await service!.getActivityTimeSeries(null, 7);

    expect(timeSeries).toHaveLength(7);
    expect(timeSeries[6]?.count).toBeGreaterThanOrEqual(1); // Today should have at least 1 event

    service!.close();
    cleanupTestDirectory();
  });

  test("should filter by directory", async () => {
    process.env.LLMD_ENABLE_EVENTS = "1";
    const config = createTestConfig(TEST_DIR);
    const service = initEventService(config, ":memory:");

    await new Promise((resolve) => setTimeout(resolve, 1000));

    // View file in docs subdirectory
    const docsFile = join(TEST_DIR, "docs", "guide.md");
    service!.recordEvent("view", docsFile, "file");

    await new Promise((resolve) => setTimeout(resolve, 100));

    // Get analytics for docs subdirectory only
    const docsDir = join(TEST_DIR, "docs");
    const analytics = await service!.getAnalytics(docsDir);

    expect(analytics.mostViewed).toHaveLength(1);
    expect(analytics.mostViewed[0]?.name).toBe("guide.md");

    service!.close();
    cleanupTestDirectory();
  });

  test("should ignore node_modules directory", async () => {
    process.env.LLMD_ENABLE_EVENTS = "1";
    const config = createTestConfig(TEST_DIR);
    const service = initEventService(config, ":memory:");

    await new Promise((resolve) => setTimeout(resolve, 1000));

    const analytics = await service!.getAnalytics();

    // node_modules/ignored.md should not be in resources
    const hasIgnored = analytics.zeroViews.some((doc) => doc.name === "ignored.md");
    expect(hasIgnored).toBe(false);

    service!.close();
    cleanupTestDirectory();
  });

  test("should queue events during scanning", async () => {
    process.env.LLMD_ENABLE_EVENTS = "1";
    const config = createTestConfig(TEST_DIR);
    const service = initEventService(config, ":memory:");

    // Record event immediately (before scan completes)
    const filePath = join(TEST_DIR, "README.md");
    service!.recordEvent("view", filePath, "file");

    // Wait for scanning to complete and queue to process
    await new Promise((resolve) => setTimeout(resolve, 1000));

    const analytics = await service!.getAnalytics();

    // Event should have been queued and then processed
    expect(analytics.totalEvents).toBe(1); // Queued view event
    expect(analytics.mostViewed).toHaveLength(1);

    service!.close();
    cleanupTestDirectory();
  });

  test("should handle non-existent files gracefully", async () => {
    process.env.LLMD_ENABLE_EVENTS = "1";
    const config = createTestConfig(TEST_DIR);
    const service = initEventService(config, ":memory:");

    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Record event for non-existent file (should create resource)
    const fakePath = join(TEST_DIR, "nonexistent.md");
    service!.recordEvent("view", fakePath, "file");

    await new Promise((resolve) => setTimeout(resolve, 100));

    const analytics = await service!.getAnalytics();

    // Should still have recorded the event
    expect(analytics.totalEvents).toBe(1); // Just the view event

    service!.close();
    cleanupTestDirectory();
  });

  test("should return empty analytics for empty directory", async () => {
    process.env.LLMD_ENABLE_EVENTS = "1";
    const emptyDir = join(TEST_DIR, "empty");
    mkdirSync(emptyDir, { recursive: true });

    const config = createTestConfig(emptyDir);
    const service = initEventService(config, ":memory:");

    await new Promise((resolve) => setTimeout(resolve, 1000));

    const analytics = await service!.getAnalytics();

    expect(analytics.totalResources).toBe(1); // Just the root dir
    expect(analytics.totalEvents).toBe(0); // No events yet
    expect(analytics.mostViewed).toHaveLength(0);
    expect(analytics.zeroViews).toHaveLength(0);

    service!.close();
    rmSync(emptyDir, { recursive: true, force: true });
    cleanupTestDirectory();
  });

  test("should get database statistics", async () => {
    process.env.LLMD_ENABLE_EVENTS = "1";
    setupTestDirectory();

    const config = createTestConfig(TEST_DIR);
    const service = initEventService(config, ":memory:");

    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Record some events
    service!.recordEvent("view", join(TEST_DIR, "README.md"), "file");
    service!.recordEvent("view", join(TEST_DIR, "docs", "guide.md"), "file");

    await new Promise((resolve) => setTimeout(resolve, 100));

    const stats = await service!.getDatabaseStats();

    expect(stats.totalResources).toBeGreaterThan(0);
    expect(stats.totalEvents).toBe(2);
    expect(stats.fileSizeBytes).toBe(0); // In-memory database has no file size
    expect(stats.fileSizeMB).toBe("0.00");
    expect(stats.databasePath).toBe(":memory:");
    expect(stats.oldestEventTimestamp).toBeTypeOf("number");
    expect(stats.newestEventTimestamp).toBeTypeOf("number");

    service!.close();
    cleanupTestDirectory();
  });

  test("should cleanup old events", async () => {
    process.env.LLMD_ENABLE_EVENTS = "1";
    setupTestDirectory();

    const config = createTestConfig(TEST_DIR);
    const service = initEventService(config, ":memory:");

    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Record some events
    service!.recordEvent("view", join(TEST_DIR, "README.md"), "file");
    service!.recordEvent("view", join(TEST_DIR, "docs", "guide.md"), "file");

    await new Promise((resolve) => setTimeout(resolve, 100));

    const statsBefore = await service!.getDatabaseStats();
    expect(statsBefore.totalEvents).toBe(2);

    // Clean up events older than 0 days (should delete all)
    const result = await service!.cleanupOldEvents(0);

    expect(result.deletedEvents).toBe(2);
    expect(result.deletedResources).toBeGreaterThan(0); // Orphaned resources should be deleted

    const statsAfter = await service!.getDatabaseStats();
    expect(statsAfter.totalEvents).toBe(0);

    service!.close();
    cleanupTestDirectory();
  });

  test("should clear database", async () => {
    process.env.LLMD_ENABLE_EVENTS = "1";
    setupTestDirectory();

    const config = createTestConfig(TEST_DIR);
    const service = initEventService(config, ":memory:");

    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Record some events
    service!.recordEvent("view", join(TEST_DIR, "README.md"), "file");
    service!.recordEvent("view", join(TEST_DIR, "docs", "guide.md"), "file");

    await new Promise((resolve) => setTimeout(resolve, 100));

    const statsBefore = await service!.getDatabaseStats();
    expect(statsBefore.totalEvents).toBe(2);
    expect(statsBefore.totalResources).toBeGreaterThan(0);

    // Clear database
    await service!.clearDatabase();

    const statsAfter = await service!.getDatabaseStats();
    expect(statsAfter.totalEvents).toBe(0);
    expect(statsAfter.totalResources).toBe(0);

    service!.close();
    cleanupTestDirectory();
  });
});
