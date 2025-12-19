// Event tracking service with SQLite backend

import { randomUUID } from "node:crypto";
import { existsSync, mkdirSync } from "node:fs";
import { homedir } from "node:os";
import { basename, dirname, join } from "node:path";
import type { Config, EventService, EventType, ResourceType } from "./types";

// Directories to ignore (as subdirectories, not if they're the root)
const IGNORED_DIRECTORIES = ["node_modules", ".git", "dist", "build", "test-fixtures"];

// Dynamic database creation for Bun vs Node.js compatibility using libsql
// biome-ignore lint/suspicious/noExplicitAny: Runtime compatibility layer
const createDatabase = (path: string): any => {
  // biome-ignore lint/suspicious/noExplicitAny: Runtime detection
  if (typeof Bun !== "undefined" && (globalThis as any).Bun) {
    const { Database } = require("bun:sqlite");
    return new Database(path);
  }
  // Use libsql for Node.js - drop-in replacement for better-sqlite3, better cross-platform support
  const LibSQL = require("libsql");
  return new LibSQL(path);
};

// Pure function: resolve database path using XDG_DATA_HOME or fallback
const resolveDatabasePath = (): string => {
  const xdgDataHome = process.env.XDG_DATA_HOME;
  const baseDir = xdgDataHome || join(homedir(), ".local", "share");
  const llmdDir = join(baseDir, "llmd");

  // Ensure directory exists
  if (!existsSync(llmdDir)) {
    mkdirSync(llmdDir, { recursive: true });
  }

  return join(llmdDir, "llmd.db");
};

// Pure function: check if path should be ignored (relative to root)
const shouldIgnorePath = (absolutePath: string, rootDir: string): boolean => {
  // Never ignore the root directory itself
  if (absolutePath === rootDir) {
    return false;
  }

  // Check if any subdirectory component is in the ignored list
  const relativePath = absolutePath.startsWith(rootDir)
    ? absolutePath.slice(rootDir.length + 1)
    : absolutePath;
  const parts = relativePath.split("/").filter(Boolean);
  return parts.some((part) => IGNORED_DIRECTORIES.includes(part));
};

// Pure function: generate UUID v4
const generateId = (): string => randomUUID();

// Side effect: initialize database schema
// biome-ignore lint/suspicious/noExplicitAny: Runtime compatibility layer
const initializeDatabase = (db: any): void => {
  // Enable foreign keys (use exec for Bun compatibility)
  db.exec("PRAGMA foreign_keys = ON");

  // Create resources table
  db.exec(`
    CREATE TABLE IF NOT EXISTS resources (
      id TEXT PRIMARY KEY,
      path TEXT UNIQUE NOT NULL,
      type TEXT NOT NULL CHECK(type IN ('file', 'dir')),
      created_at INTEGER NOT NULL
    );
  `);

  // Create events table
  db.exec(`
    CREATE TABLE IF NOT EXISTS events (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL CHECK(type IN ('view', 'open')),
      resource_id TEXT NOT NULL,
      timestamp INTEGER NOT NULL,
      FOREIGN KEY (resource_id) REFERENCES resources(id)
    );
  `);

  // Create configuration table
  db.exec(`
    CREATE TABLE IF NOT EXISTS config (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `);

  // Create indexes
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_events_resource_id ON events(resource_id);
    CREATE INDEX IF NOT EXISTS idx_events_timestamp ON events(timestamp);
    CREATE INDEX IF NOT EXISTS idx_events_type ON events(type);
    CREATE INDEX IF NOT EXISTS idx_resources_path ON resources(path);
  `);

  // Initialize highlights schema (adds columns to resources table + new highlights table)
  const { initializeHighlightsSchema } = require("./highlights");
  initializeHighlightsSchema(db);
};

// Side effect: recursively scan directory and create resources
const scanAndCreateResources = async (
  db: any,
  rootDir: string,
  pathMap: Map<string, string>
): Promise<void> => {
  const { scanMarkdownFiles } = await import("./scanner");

  // Scan directory tree
  const files = await scanMarkdownFiles(rootDir, 10);

  const insertStmt = db.prepare(
    "INSERT OR IGNORE INTO resources (id, path, type, created_at) VALUES (?, ?, ?, ?)"
  );

  const selectStmt = db.prepare("SELECT id FROM resources WHERE path = ?");

  // Insert root directory first
  const rootId = generateId();
  const rootTimestamp = Date.now();
  insertStmt.run(rootId, rootDir, "dir", rootTimestamp);

  const existingRoot = selectStmt.get(rootDir) as { id: string } | undefined;
  if (existingRoot) {
    pathMap.set(rootDir, existingRoot.id);
  } else {
    pathMap.set(rootDir, rootId);
  }

  // Helper: insert directory resource
  const insertDirectory = (dirPath: string, processedDirs: Set<string>): void => {
    const dirId = generateId();
    const timestamp = Date.now();
    insertStmt.run(dirId, dirPath, "dir", timestamp);

    const existing = selectStmt.get(dirPath) as { id: string } | undefined;
    if (existing) {
      pathMap.set(dirPath, existing.id);
    } else {
      pathMap.set(dirPath, dirId);
    }
    processedDirs.add(dirPath);
  };

  // Helper: insert file resource
  const insertFile = (absolutePath: string): void => {
    const fileId = generateId();
    const timestamp = Date.now();
    insertStmt.run(fileId, absolutePath, "file", timestamp);

    const existingFile = selectStmt.get(absolutePath) as { id: string } | undefined;
    if (existingFile) {
      pathMap.set(absolutePath, existingFile.id);
    } else {
      pathMap.set(absolutePath, fileId);
    }
  };

  // Helper: collect parent directories to create
  const collectParentDirs = (absolutePath: string, processedDirs: Set<string>): string[] => {
    let currentPath = dirname(absolutePath);
    const dirsToCreate: string[] = [];

    while (currentPath !== rootDir && !processedDirs.has(currentPath)) {
      if (!shouldIgnorePath(currentPath, rootDir)) {
        dirsToCreate.unshift(currentPath);
      }
      currentPath = dirname(currentPath);
    }

    return dirsToCreate;
  };

  // Insert all files and their parent directories
  const transaction = db.transaction((filesToInsert: Array<{ path: string; name: string }>) => {
    const processedDirs = new Set<string>();

    for (const file of filesToInsert) {
      const absolutePath = join(rootDir, file.path);

      // Skip ignored paths
      if (shouldIgnorePath(absolutePath, rootDir)) {
        continue;
      }

      // Collect and insert parent directories
      const dirsToCreate = collectParentDirs(absolutePath, processedDirs);
      for (const dirPath of dirsToCreate) {
        insertDirectory(dirPath, processedDirs);
      }

      // Insert file
      insertFile(absolutePath);
    }
  });

  transaction(files);
};

// Side effect: check database file size and warn if large
const checkDatabaseSize = (dbPath: string): void => {
  // TODO: Make this threshold configurable via environment variable or config file
  const MAX_DB_SIZE_MB = 50;
  const MAX_DB_SIZE_BYTES = MAX_DB_SIZE_MB * 1024 * 1024;

  try {
    const { statSync } = require("node:fs");
    const stats = statSync(dbPath);
    const sizeMB = (stats.size / 1024 / 1024).toFixed(2);

    if (stats.size > MAX_DB_SIZE_BYTES) {
      console.warn(`[events] Database size is ${sizeMB}MB (threshold: ${MAX_DB_SIZE_MB}MB)`);
      console.warn(`[events] Consider deleting old data: rm ${dbPath}`);
    }
  } catch (_err) {
    // File doesn't exist yet or can't be read - not a problem
  }
};

// Side effect: get config value from database
// biome-ignore lint/suspicious/noExplicitAny: Runtime compatibility layer
const getConfigValue = (db: any, key: string): string | null => {
  try {
    const stmt = db.prepare("SELECT value FROM config WHERE key = ?");
    const row = stmt.get(key) as { value: string } | undefined;
    return row?.value ?? null;
  } catch {
    return null;
  }
};

// Side effect: set config value in database
// biome-ignore lint/suspicious/noExplicitAny: Runtime compatibility layer
const setConfigValue = (db: any, key: string, value: string): void => {
  const stmt = db.prepare("INSERT OR REPLACE INTO config (key, value) VALUES (?, ?)");
  stmt.run(key, value);
};

// Side effect: check if analytics is enabled
// Priority: 1) Environment variable, 2) Database config, 3) Default (enabled)
// biome-ignore lint/suspicious/noExplicitAny: Runtime compatibility layer
const isAnalyticsEnabled = (db: any): boolean => {
  // Environment variable takes precedence
  if (process.env.LLMD_ENABLE_EVENTS === "false") {
    return false;
  }
  if (process.env.LLMD_ENABLE_EVENTS === "true") {
    return true;
  }

  // Check database config
  const configValue = getConfigValue(db, "analytics_enabled");

  // Default to enabled if not explicitly set
  if (configValue === "false") {
    return false;
  }
  return true; // Default: enabled
};

// Side effect: initialize event service (creates database, starts scanning)
export const initEventService = (config: Config, dbPath?: string): EventService | null => {
  const actualDbPath = dbPath ?? resolveDatabasePath();

  // Check database size and warn if large
  checkDatabaseSize(actualDbPath);

  const db = createDatabase(actualDbPath);

  // Initialize schema
  initializeDatabase(db);

  // Check if events are enabled (opt-in)
  // Priority: 1) Environment variable, 2) Database config
  if (!isAnalyticsEnabled(db)) {
    db.close();
    return null;
  }

  // In-memory map for path -> resource ID lookups
  const pathMap = new Map<string, string>();

  // Event queue (holds events until scan completes)
  const eventQueue: Array<{
    type: EventType;
    path: string;
    resourceType: ResourceType;
  }> = [];
  let isScanning = true;

  // Start async resource scanning
  const scanPromise = scanAndCreateResources(db, config.directory, pathMap)
    .then(() => {
      isScanning = false;
      // Process queued events
      for (const event of eventQueue) {
        recordEventSync(event.type, event.path, event.resourceType);
      }
      eventQueue.length = 0;
    })
    .catch((err) => {
      console.error("[events] Failed to scan resources:", err);
      isScanning = false;
    });

  // Helper: synchronously record event (assumes resource exists)
  const recordEventSync = (
    type: EventType,
    absolutePath: string,
    resourceType: ResourceType
  ): void => {
    // Skip ignored paths
    if (shouldIgnorePath(absolutePath, config.directory)) {
      return;
    }

    try {
      // Look up resource ID
      let resourceId = pathMap.get(absolutePath);

      // If not in map, query database
      if (!resourceId) {
        const stmt = db.prepare("SELECT id FROM resources WHERE path = ?");
        const result = stmt.get(absolutePath) as { id: string } | undefined;

        if (result) {
          resourceId = result.id;
          pathMap.set(absolutePath, resourceId);
        } else {
          // Resource doesn't exist - create it
          resourceId = generateId();
          const timestamp = Date.now();
          const insertStmt = db.prepare(
            "INSERT INTO resources (id, path, type, created_at) VALUES (?, ?, ?, ?)"
          );
          insertStmt.run(resourceId, absolutePath, resourceType, timestamp);
          pathMap.set(absolutePath, resourceId);
        }
      }

      // Insert event
      const eventId = generateId();
      const timestamp = Date.now();
      const stmt = db.prepare(
        "INSERT INTO events (id, type, resource_id, timestamp) VALUES (?, ?, ?, ?)"
      );
      stmt.run(eventId, type, resourceId, timestamp);
    } catch (err) {
      console.error("[events] Failed to record event:", err);
    }
  };

  // Public API: record event
  const recordEvent = (type: EventType, absolutePath: string, resourceType: ResourceType): void => {
    if (isScanning) {
      // Queue event until scan completes
      eventQueue.push({ type, path: absolutePath, resourceType });
    } else {
      recordEventSync(type, absolutePath, resourceType);
    }
  };

  // Public API: get analytics data
  const getAnalytics = async (
    directory?: string
  ): Promise<{
    currentDirectory: string;
    mostViewed: Array<{ path: string; name: string; views: number }>;
    timeSeries: Array<{ date: string; count: number }>;
    zeroViews: Array<{ path: string; name: string }>;
    totalEvents: number;
    totalResources: number;
  }> => {
    // Wait for scanning to complete
    await scanPromise;

    const targetDir = directory || config.directory;

    // Get most viewed documents
    const mostViewedStmt = db.prepare(`
      SELECT r.path, COUNT(e.id) as views
      FROM resources r
      JOIN events e ON e.resource_id = r.id
      WHERE e.type = 'view' AND r.path LIKE ?
      GROUP BY r.id
      ORDER BY views DESC
      LIMIT 20
    `);
    const mostViewed = mostViewedStmt.all(`${targetDir}%`) as Array<{
      path: string;
      views: number;
    }>;

    // Get documents with zero views
    const zeroViewsStmt = db.prepare(`
      SELECT r.path
      FROM resources r
      WHERE r.type = 'file' 
        AND r.path LIKE ?
        AND NOT EXISTS (
          SELECT 1 FROM events e 
          WHERE e.resource_id = r.id AND e.type = 'view'
        )
      ORDER BY r.path
      LIMIT 50
    `);
    const zeroViews = zeroViewsStmt.all(`${targetDir}%`) as Array<{ path: string }>;

    // Get total events
    const totalEventsStmt = db.prepare(
      "SELECT COUNT(*) as count FROM events WHERE resource_id IN (SELECT id FROM resources WHERE path LIKE ?)"
    );
    const totalEvents = (totalEventsStmt.get(`${targetDir}%`) as { count: number }).count;

    // Get total resources
    const totalResourcesStmt = db.prepare(
      "SELECT COUNT(*) as count FROM resources WHERE path LIKE ?"
    );
    const totalResources = (totalResourcesStmt.get(`${targetDir}%`) as { count: number }).count;

    return {
      currentDirectory: targetDir,
      mostViewed: mostViewed.map((row) => ({
        path: row.path,
        name: basename(row.path),
        views: row.views,
      })),
      timeSeries: [], // Will be populated by getActivityTimeSeries
      zeroViews: zeroViews.map((row) => ({
        path: row.path,
        name: basename(row.path),
      })),
      totalEvents,
      totalResources,
    };
  };

  // Public API: get activity time series
  const getActivityTimeSeries = async (
    directory: string | null,
    days: number
  ): Promise<Array<{ date: string; count: number }>> => {
    // Wait for scanning to complete
    await scanPromise;

    const targetDir = directory || config.directory;
    const startTimestamp = Date.now() - days * 24 * 60 * 60 * 1000;

    const stmt = db.prepare(`
      SELECT 
        DATE(e.timestamp / 1000, 'unixepoch') as date,
        COUNT(*) as count
      FROM events e
      JOIN resources r ON e.resource_id = r.id
      WHERE e.timestamp >= ? AND r.path LIKE ?
      GROUP BY date
      ORDER BY date ASC
    `);

    const results = stmt.all(startTimestamp, `${targetDir}%`) as Array<{
      date: string;
      count: number;
    }>;

    // Fill in missing dates with zero counts
    const dateMap = new Map<string, number>();
    for (const result of results) {
      dateMap.set(result.date, result.count);
    }

    const timeSeries: Array<{ date: string; count: number }> = [];
    for (let i = 0; i < days; i++) {
      const date = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
      const dateStr = date.toISOString().split("T")[0] as string;
      timeSeries.unshift({
        date: dateStr,
        count: dateMap.get(dateStr) || 0,
      });
    }

    return timeSeries;
  };

  // Public API: get database statistics
  const getDatabaseStatsService = async (): Promise<import("./types").DatabaseStats> => {
    // Get file size (skip for in-memory databases)
    let fileSizeBytes = 0;
    let fileSizeMB = "0.00";

    if (actualDbPath !== ":memory:") {
      const { statSync } = await import("node:fs");
      const stats = statSync(actualDbPath);
      fileSizeBytes = stats.size;
      fileSizeMB = (fileSizeBytes / (1024 * 1024)).toFixed(2);
    }

    // Get total resources
    const totalResourcesStmt = db.prepare("SELECT COUNT(*) as count FROM resources");
    const totalResources = (totalResourcesStmt.get() as { count: number }).count;

    // Get total events
    const totalEventsStmt = db.prepare("SELECT COUNT(*) as count FROM events");
    const totalEvents = (totalEventsStmt.get() as { count: number }).count;

    // Get oldest and newest event timestamps
    const oldestStmt = db.prepare("SELECT MIN(timestamp) as oldest FROM events");
    const newestStmt = db.prepare("SELECT MAX(timestamp) as newest FROM events");
    const oldestResult = oldestStmt.get() as { oldest: number | null };
    const newestResult = newestStmt.get() as { newest: number | null };

    return {
      fileSizeBytes,
      fileSizeMB,
      totalResources,
      totalEvents,
      oldestEventTimestamp: oldestResult.oldest,
      newestEventTimestamp: newestResult.newest,
      databasePath: actualDbPath,
    };
  };

  // Public API: cleanup old events
  // biome-ignore lint/suspicious/useAwait: Wrapped for consistent async API
  const cleanupOldEventsService = async (
    days: number
  ): Promise<{ deletedEvents: number; deletedResources: number }> => {
    const cutoffTime = Date.now() - days * 24 * 60 * 60 * 1000;

    // Delete old events
    const deleteEventsStmt = db.prepare("DELETE FROM events WHERE timestamp < ?");
    const eventsResult = deleteEventsStmt.run(cutoffTime);
    const deletedEvents = eventsResult.changes || 0;

    // Delete resources that have no events (orphaned resources)
    const deleteResourcesStmt = db.prepare(`
      DELETE FROM resources 
      WHERE id NOT IN (SELECT DISTINCT resource_id FROM events)
    `);
    const resourcesResult = deleteResourcesStmt.run();
    const deletedResources = resourcesResult.changes || 0;

    return { deletedEvents, deletedResources };
  };

  // Public API: clear database
  // biome-ignore lint/suspicious/useAwait: Wrapped for consistent async API
  const clearDatabaseService = async (): Promise<void> => {
    // Delete all events first (due to foreign key constraints)
    db.exec("DELETE FROM events");
    // Delete all resources
    db.exec("DELETE FROM resources");
    // Vacuum to reclaim space
    db.exec("VACUUM");
  };

  // Public API: close database
  const close = (): void => {
    db.close();
  };

  // Public API: get database handle (for highlights and other extensions)
  // biome-ignore lint/suspicious/noExplicitAny: Runtime compatibility layer
  const getDatabase = (): any => db;

  return {
    recordEvent,
    getAnalytics,
    getActivityTimeSeries,
    getDatabaseStats: getDatabaseStatsService,
    cleanupOldEvents: cleanupOldEventsService,
    clearDatabase: clearDatabaseService,
    getDatabase,
    close,
  };
};

// Side effect: enable analytics (sets database config)
export const enableAnalytics = (): void => {
  const dbPath = resolveDatabasePath();
  const db = createDatabase(dbPath);

  // Initialize schema if needed
  initializeDatabase(db);

  // Set config
  setConfigValue(db, "analytics_enabled", "true");

  db.close();

  console.log("[events] Analytics enabled");
  console.log(`[events] Database: ${dbPath}`);
};

// Side effect: disable analytics (sets database config)
export const disableAnalytics = (): void => {
  const dbPath = resolveDatabasePath();
  const db = createDatabase(dbPath);

  // Initialize schema if needed
  initializeDatabase(db);

  // Set config
  setConfigValue(db, "analytics_enabled", "false");

  db.close();

  console.log("[events] Analytics disabled");
};

// Side effect: check analytics status (reads env and database)
export const getAnalyticsStatus = (): {
  enabled: boolean;
  source: "environment" | "database" | "default";
} => {
  // Check environment variable first
  if (process.env.LLMD_ENABLE_EVENTS === "false") {
    return { enabled: false, source: "environment" };
  }
  if (process.env.LLMD_ENABLE_EVENTS === "true") {
    return { enabled: true, source: "environment" };
  }

  // Check database
  try {
    const dbPath = resolveDatabasePath();
    const db = createDatabase(dbPath);
    initializeDatabase(db);
    const configValue = getConfigValue(db, "analytics_enabled");
    db.close();

    if (configValue === "true") {
      return { enabled: true, source: "database" };
    }
    if (configValue === "false") {
      return { enabled: false, source: "database" };
    }
  } catch {
    // Database doesn't exist or can't be read - use default
  }

  // Default: enabled
  return { enabled: true, source: "default" };
};

// Side effect: save theme preferences to database
export const saveThemePreferences = (theme: string): void => {
  try {
    // Skip if theme is empty or undefined
    if (!theme) {
      return;
    }

    const dbPath = resolveDatabasePath();
    const db = createDatabase(dbPath);
    initializeDatabase(db);

    setConfigValue(db, "theme", theme);

    db.close();
  } catch (err) {
    // Silently fail - theme preferences are not critical
    console.error("[events] Failed to save theme preferences:", err);
  }
};

// Side effect: load theme preferences from database
export const loadThemePreferences = (): { theme?: string } => {
  try {
    const dbPath = resolveDatabasePath();
    const db = createDatabase(dbPath);
    initializeDatabase(db);

    const theme = getConfigValue(db, "theme");

    db.close();

    return {
      theme: theme || undefined,
    };
  } catch {
    // Database doesn't exist or can't be read - return empty
    return {};
  }
};

// Side effect: enable highlights (sets database config)
export const enableHighlights = (): void => {
  const dbPath = resolveDatabasePath();
  const db = createDatabase(dbPath);

  // Initialize schema if needed
  initializeDatabase(db);

  // Set config
  setConfigValue(db, "highlights_enabled", "true");

  db.close();

  console.log("[highlights] Highlights enabled");
  console.log(`[highlights] Database: ${dbPath}`);
};

// Side effect: disable highlights (sets database config)
export const disableHighlights = (): void => {
  const dbPath = resolveDatabasePath();
  const db = createDatabase(dbPath);

  // Initialize schema if needed
  initializeDatabase(db);

  // Set config
  setConfigValue(db, "highlights_enabled", "false");

  db.close();

  console.log("[highlights] Highlights disabled");
};

// Side effect: check if highlights is enabled
// Priority: 1) Environment variable, 2) Database config, 3) Default (enabled)
export const isHighlightsEnabled = (): boolean => {
  // Environment variable takes precedence
  if (process.env.LLMD_ENABLE_HIGHLIGHTS === "false") {
    return false;
  }
  if (process.env.LLMD_ENABLE_HIGHLIGHTS === "true") {
    return true;
  }

  // Check database config
  try {
    const dbPath = resolveDatabasePath();
    const db = createDatabase(dbPath);
    initializeDatabase(db);
    const configValue = getConfigValue(db, "highlights_enabled");
    db.close();

    // Default to enabled if not set
    if (configValue === "false") {
      return false;
    }
    return true; // Default: enabled
  } catch {
    // Database doesn't exist or can't be read - default to enabled
    return true;
  }
};

// Side effect: get database statistics
export const getDatabaseStats = async (): Promise<import("./types").DatabaseStats> => {
  const dbPath = resolveDatabasePath();
  const db = createDatabase(dbPath);
  initializeDatabase(db);

  try {
    // Get file size
    const { statSync } = await import("node:fs");
    const stats = statSync(dbPath);
    const fileSizeBytes = stats.size;
    const fileSizeMB = (fileSizeBytes / (1024 * 1024)).toFixed(2);

    // Get total resources
    const totalResourcesStmt = db.prepare("SELECT COUNT(*) as count FROM resources");
    const totalResources = (totalResourcesStmt.get() as { count: number }).count;

    // Get total events
    const totalEventsStmt = db.prepare("SELECT COUNT(*) as count FROM events");
    const totalEvents = (totalEventsStmt.get() as { count: number }).count;

    // Get oldest and newest event timestamps
    const oldestStmt = db.prepare("SELECT MIN(timestamp) as oldest FROM events");
    const newestStmt = db.prepare("SELECT MAX(timestamp) as newest FROM events");
    const oldestResult = oldestStmt.get() as { oldest: number | null };
    const newestResult = newestStmt.get() as { newest: number | null };

    return {
      fileSizeBytes,
      fileSizeMB,
      totalResources,
      totalEvents,
      oldestEventTimestamp: oldestResult.oldest,
      newestEventTimestamp: newestResult.newest,
      databasePath: dbPath,
    };
  } finally {
    db.close();
  }
};

// Side effect: cleanup old events (delete events older than N days)
export const cleanupOldEvents = (
  days: number
): { deletedEvents: number; deletedResources: number } => {
  const dbPath = resolveDatabasePath();
  const db = createDatabase(dbPath);
  initializeDatabase(db);

  try {
    const cutoffTime = Date.now() - days * 24 * 60 * 60 * 1000;

    // Delete old events
    const deleteEventsStmt = db.prepare("DELETE FROM events WHERE timestamp < ?");
    const eventsResult = deleteEventsStmt.run(cutoffTime);
    const deletedEvents = eventsResult.changes || 0;

    // Delete resources that have no events (orphaned resources)
    const deleteResourcesStmt = db.prepare(`
      DELETE FROM resources 
      WHERE id NOT IN (SELECT DISTINCT resource_id FROM events)
    `);
    const resourcesResult = deleteResourcesStmt.run();
    const deletedResources = resourcesResult.changes || 0;

    return { deletedEvents, deletedResources };
  } finally {
    db.close();
  }
};

// Side effect: clear all events and resources from database
export const clearDatabase = (): void => {
  const dbPath = resolveDatabasePath();
  const db = createDatabase(dbPath);
  initializeDatabase(db);

  try {
    // Delete all events first (due to foreign key constraints)
    db.exec("DELETE FROM events");
    // Delete all resources
    db.exec("DELETE FROM resources");
    // Vacuum to reclaim space
    db.exec("VACUUM");
  } finally {
    db.close();
  }
};
