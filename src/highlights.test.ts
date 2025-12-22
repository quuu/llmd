import { describe, expect, test } from "bun:test";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  backupFile,
  computeFileHash,
  createHighlight,
  deleteHighlight,
  deleteInvalidHighlights,
  directoryHasHighlights,
  extractTextByOffset,
  findTextOffset,
  getDirectoryPath,
  getHighlightsByDirectory,
  getHighlightsByResource,
  getResourceByPath,
  initializeHighlightsSchema,
  markHighlightStale,
  resolveCacheDirectory,
  restoreFile,
  updateHighlight,
  updateResourceBackup,
  validateHighlight,
} from "./highlights";

// Helper: create in-memory database for testing
const createTestDatabase = () => {
  const { Database } = require("bun:sqlite");
  const db = new Database(":memory:");

  // Initialize base schema (resources table)
  db.exec("PRAGMA foreign_keys = ON");
  db.exec(`
    CREATE TABLE resources (
      id TEXT PRIMARY KEY,
      path TEXT UNIQUE NOT NULL,
      type TEXT NOT NULL CHECK(type IN ('file', 'dir')),
      created_at INTEGER NOT NULL,
      content_hash TEXT,
      backup_path TEXT
    );
  `);

  // Initialize highlights schema
  initializeHighlightsSchema(db);

  return db;
};

// Helper: insert test resource
const insertTestResource = (db: any, id: string, path: string, type: string) => {
  const stmt = db.prepare("INSERT INTO resources (id, path, type, created_at) VALUES (?, ?, ?, ?)");
  stmt.run(id, path, type, Date.now());
};

describe("computeFileHash", () => {
  test("generates consistent SHA-256 hash", () => {
    const content = "Hello, world!";
    const hash1 = computeFileHash(content);
    const hash2 = computeFileHash(content);

    expect(hash1).toBe(hash2);
    expect(hash1).toHaveLength(64); // SHA-256 produces 64-char hex string
  });

  test("generates different hashes for different content", () => {
    const content1 = "Hello, world!";
    const content2 = "Hello, World!";

    const hash1 = computeFileHash(content1);
    const hash2 = computeFileHash(content2);

    expect(hash1).not.toBe(hash2);
  });
});

describe("resolveCacheDirectory", () => {
  test("returns path with llmd/file-backups subdirectory", () => {
    const cacheDir = resolveCacheDirectory();
    expect(cacheDir).toContain("llmd");
    expect(cacheDir).toContain("file-backups");
  });
});

describe("findTextOffset", () => {
  test("finds unique text and returns offsets", () => {
    const content = "The quick brown fox jumps over the lazy dog";
    const searchText = "brown fox";

    const result = findTextOffset(content, searchText);

    expect(result).not.toBeNull();
    expect(result?.startOffset).toBe(10);
    expect(result?.endOffset).toBe(19);
  });

  test("returns null when text not found", () => {
    const content = "The quick brown fox jumps over the lazy dog";
    const searchText = "purple elephant";

    const result = findTextOffset(content, searchText);

    expect(result).toBeNull();
  });

  test("returns first occurrence when text appears multiple times", () => {
    const content = "The quick brown fox jumps over the brown dog";
    const searchText = "brown";

    // Should return first occurrence by default (index 0)
    const result = findTextOffset(content, searchText, 0);

    expect(result).toEqual({
      startOffset: 10,
      endOffset: 15,
    });
  });

  test("returns second occurrence with index 1", () => {
    const content = "The quick brown fox jumps over the brown dog";
    const searchText = "brown";

    const result = findTextOffset(content, searchText, 1);

    expect(result).toEqual({
      startOffset: 35,
      endOffset: 40,
    });
  });

  test("returns null when occurrence index out of bounds", () => {
    const content = "The quick brown fox";
    const searchText = "brown";

    const result = findTextOffset(content, searchText, 5);

    expect(result).toBeNull();
  });
});

describe("extractTextByOffset", () => {
  test("extracts text using offsets", () => {
    const content = "The quick brown fox jumps over the lazy dog";
    const startOffset = 10;
    const endOffset = 19;

    const extracted = extractTextByOffset(content, startOffset, endOffset);

    expect(extracted).toBe("brown fox");
  });
});

describe("validateHighlight", () => {
  test("returns valid when hash matches", () => {
    const content = "The quick brown fox";
    const contentHash = computeFileHash(content);

    const result = validateHighlight({
      content,
      contentHash,
      startOffset: 10,
      endOffset: 19,
      highlightedText: "brown fox",
    });

    expect(result.isValid).toBe(true);
    expect(result.newStartOffset).toBeUndefined();
    expect(result.newEndOffset).toBeUndefined();
    expect(result.newContentHash).toBeUndefined();
  });

  test("updates offsets when text found in modified content", () => {
    const originalContent = "The quick brown fox";
    const modifiedContent = "Hello! The quick brown fox";
    const originalHash = computeFileHash(originalContent);

    const result = validateHighlight({
      content: modifiedContent,
      contentHash: originalHash,
      startOffset: 10,
      endOffset: 19,
      highlightedText: "brown fox",
    });

    expect(result.isValid).toBe(true);
    expect(result.newStartOffset).toBe(17);
    expect(result.newEndOffset).toBe(26);
    expect(result.newContentHash).toBeDefined();
  });

  test("marks as invalid when text not found in modified content", () => {
    const originalContent = "The quick brown fox";
    const modifiedContent = "The quick red fox";
    const originalHash = computeFileHash(originalContent);

    const result = validateHighlight({
      content: modifiedContent,
      contentHash: originalHash,
      startOffset: 10,
      endOffset: 19,
      highlightedText: "brown fox",
    });

    expect(result.isValid).toBe(false);
  });

  test("finds text when it appears multiple times (uses first occurrence)", () => {
    const originalContent = "The quick brown fox";
    const modifiedContent = "brown The quick brown fox brown";
    const originalHash = computeFileHash(originalContent);

    const result = validateHighlight({
      content: modifiedContent,
      contentHash: originalHash,
      startOffset: 10,
      endOffset: 15,
      highlightedText: "brown",
    });

    // Now finds the first occurrence instead of marking as invalid
    expect(result.isValid).toBe(true);
    expect(result.newStartOffset).toBe(0);
    expect(result.newEndOffset).toBe(5);
  });
});

describe("getDirectoryPath", () => {
  test("returns directory path from file path", () => {
    const filePath = "/Users/test/docs/guide.md";
    const dirPath = getDirectoryPath(filePath);

    expect(dirPath).toBe("/Users/test/docs");
  });
});

describe("database operations", () => {
  test("createHighlight inserts highlight into database", () => {
    const db = createTestDatabase();
    insertTestResource(db, "resource-1", "/test/file.md", "file");

    const highlightId = createHighlight({
      db,
      resourceId: "resource-1",
      startOffset: 0,
      endOffset: 10,
      highlightedText: "Hello world",
      contentHash: "hash123",
    });

    expect(highlightId).toBeDefined();
    expect(typeof highlightId).toBe("string");

    // Verify insertion
    const stmt = db.prepare("SELECT * FROM highlights WHERE id = ?");
    const result = stmt.get(highlightId);
    expect(result).toBeDefined();
  });

  test("getHighlightsByResource returns highlights for a resource", () => {
    const db = createTestDatabase();
    insertTestResource(db, "resource-1", "/test/file.md", "file");

    createHighlight({
      db,
      resourceId: "resource-1",
      startOffset: 0,
      endOffset: 10,
      highlightedText: "First highlight",
      contentHash: "hash1",
    });

    createHighlight({
      db,
      resourceId: "resource-1",
      startOffset: 20,
      endOffset: 30,
      highlightedText: "Second highlight",
      contentHash: "hash2",
    });

    const highlights = getHighlightsByResource(db, "resource-1");

    expect(highlights).toHaveLength(2);
    expect(highlights[0]?.highlightedText).toBe("First highlight");
    expect(highlights[1]?.highlightedText).toBe("Second highlight");
  });

  test("getHighlightsByDirectory returns highlights for all files in directory", () => {
    const db = createTestDatabase();
    insertTestResource(db, "resource-1", "/test/docs/file1.md", "file");
    insertTestResource(db, "resource-2", "/test/docs/file2.md", "file");
    insertTestResource(db, "resource-3", "/other/file3.md", "file");

    createHighlight({
      db,
      resourceId: "resource-1",
      startOffset: 0,
      endOffset: 10,
      highlightedText: "Highlight 1",
      contentHash: "hash1",
    });

    createHighlight({
      db,
      resourceId: "resource-2",
      startOffset: 0,
      endOffset: 10,
      highlightedText: "Highlight 2",
      contentHash: "hash2",
    });

    createHighlight({
      db,
      resourceId: "resource-3",
      startOffset: 0,
      endOffset: 10,
      highlightedText: "Highlight 3",
      contentHash: "hash3",
    });

    const highlights = getHighlightsByDirectory(db, "/test/docs");

    expect(highlights).toHaveLength(2);
    expect(highlights.some((h) => h.highlightedText === "Highlight 1")).toBe(true);
    expect(highlights.some((h) => h.highlightedText === "Highlight 2")).toBe(true);
    expect(highlights.some((h) => h.highlightedText === "Highlight 3")).toBe(false);
  });

  test("markHighlightStale marks highlight as stale", () => {
    const db = createTestDatabase();
    insertTestResource(db, "resource-1", "/test/file.md", "file");

    const highlightId = createHighlight({
      db,
      resourceId: "resource-1",
      startOffset: 0,
      endOffset: 10,
      highlightedText: "Test",
      contentHash: "hash1",
    });

    markHighlightStale(db, highlightId);

    const highlights = getHighlightsByResource(db, "resource-1");
    expect(highlights[0]?.isStale).toBe(true);
  });

  test("updateHighlight updates offsets and clears stale flag", () => {
    const db = createTestDatabase();
    insertTestResource(db, "resource-1", "/test/file.md", "file");

    const highlightId = createHighlight({
      db,
      resourceId: "resource-1",
      startOffset: 0,
      endOffset: 10,
      highlightedText: "Test",
      contentHash: "hash1",
    });

    markHighlightStale(db, highlightId);

    updateHighlight({
      db,
      highlightId,
      startOffset: 5,
      endOffset: 15,
      contentHash: "hash2",
    });

    const highlights = getHighlightsByResource(db, "resource-1");
    expect(highlights[0]?.startOffset).toBe(5);
    expect(highlights[0]?.endOffset).toBe(15);
    expect(highlights[0]?.contentHash).toBe("hash2");
    expect(highlights[0]?.isStale).toBe(false);
  });

  test("deleteHighlight removes highlight from database", () => {
    const db = createTestDatabase();
    insertTestResource(db, "resource-1", "/test/file.md", "file");

    const highlightId = createHighlight({
      db,
      resourceId: "resource-1",
      startOffset: 0,
      endOffset: 10,
      highlightedText: "Test",
      contentHash: "hash1",
    });

    deleteHighlight(db, highlightId);

    const highlights = getHighlightsByResource(db, "resource-1");
    expect(highlights).toHaveLength(0);
  });

  test("deleteInvalidHighlights removes highlights where text no longer exists", () => {
    const db = createTestDatabase();
    insertTestResource(db, "resource-1", "/test/file.md", "file");

    const content = "Hello world, this is a test document.";
    const hash = computeFileHash(content);

    // Create highlight for text that exists
    const validId = createHighlight({
      db,
      resourceId: "resource-1",
      startOffset: 0,
      endOffset: 11,
      highlightedText: "Hello world",
      contentHash: hash,
    });

    // Create highlight for text that will be removed
    const invalidId = createHighlight({
      db,
      resourceId: "resource-1",
      startOffset: 20,
      endOffset: 24,
      highlightedText: "test",
      contentHash: hash,
    });

    // New content without "test" but with "Hello world"
    const newContent = "Hello world, this is a document.";

    const deletedCount = deleteInvalidHighlights(db, "resource-1", newContent);

    expect(deletedCount).toBe(1);

    const highlights = getHighlightsByResource(db, "resource-1");
    expect(highlights).toHaveLength(1);
    expect(highlights[0]?.id).toBe(validId);
  });

  test("updateResourceBackup updates resource with hash and backup path", () => {
    const db = createTestDatabase();
    insertTestResource(db, "resource-1", "/test/file.md", "file");

    updateResourceBackup(db, "resource-1", "newhash123", "/backup/path.md");

    const resource = getResourceByPath(db, "/test/file.md");
    expect(resource?.contentHash).toBe("newhash123");
    expect(resource?.backupPath).toBe("/backup/path.md");
  });

  test("getResourceByPath returns null for non-existent resource", () => {
    const db = createTestDatabase();

    const resource = getResourceByPath(db, "/nonexistent.md");
    expect(resource).toBeNull();
  });

  test("directoryHasHighlights returns true when directory has highlights", () => {
    const db = createTestDatabase();
    insertTestResource(db, "resource-1", "/test/docs/file.md", "file");

    createHighlight({
      db,
      resourceId: "resource-1",
      startOffset: 0,
      endOffset: 10,
      highlightedText: "Test",
      contentHash: "hash1",
    });

    expect(directoryHasHighlights(db, "/test/docs")).toBe(true);
    expect(directoryHasHighlights(db, "/other")).toBe(false);
  });
});

describe("file operations", () => {
  test("backupFile creates backup in cache directory", () => {
    const testDir = join(tmpdir(), `llmd-test-${Date.now()}`);
    const testFile = join(testDir, "test.md");

    try {
      mkdirSync(testDir, { recursive: true });
      writeFileSync(testFile, "Test content");

      const backupPath = backupFile(testFile, "resource-123", 1_234_567_890);

      expect(backupPath).toContain("resource-123");
      expect(backupPath).toContain("1234567890");
      expect(backupPath).toContain("test.md");
    } finally {
      rmSync(testDir, { recursive: true, force: true });
    }
  });

  test("restoreFile replaces original file when useTimestamp is false", () => {
    const testDir = join(tmpdir(), `llmd-test-${Date.now()}`);
    const originalFile = join(testDir, "original.md");
    const backupFile = join(testDir, "backup.md");

    try {
      mkdirSync(testDir, { recursive: true });
      writeFileSync(originalFile, "Modified content");
      writeFileSync(backupFile, "Original content");

      const restoredPath = restoreFile({
        backupPath: backupFile,
        originalPath: originalFile,
        useTimestamp: false,
        timestamp: Date.now(),
      });

      expect(restoredPath).toBe(originalFile);
    } finally {
      rmSync(testDir, { recursive: true, force: true });
    }
  });

  test("restoreFile creates timestamped copy when useTimestamp is true", () => {
    const testDir = join(tmpdir(), `llmd-test-${Date.now()}`);
    const originalFile = join(testDir, "original.md");
    const backupFile = join(testDir, "backup.md");

    try {
      mkdirSync(testDir, { recursive: true });
      writeFileSync(originalFile, "Modified content");
      writeFileSync(backupFile, "Original content");

      const timestamp = Date.now();
      const restoredPath = restoreFile({
        backupPath: backupFile,
        originalPath: originalFile,
        useTimestamp: true,
        timestamp,
      });

      expect(restoredPath).not.toBe(originalFile);
      expect(restoredPath).toContain("original_");
      expect(restoredPath).toContain(".md");
    } finally {
      rmSync(testDir, { recursive: true, force: true });
    }
  });

  test("restoreFile throws error when backup doesn't exist", () => {
    const testDir = join(tmpdir(), `llmd-test-${Date.now()}`);
    const nonExistentBackup = join(testDir, "nonexistent.md");
    const originalFile = join(testDir, "original.md");

    try {
      expect(() => {
        restoreFile({
          backupPath: nonExistentBackup,
          originalPath: originalFile,
          useTimestamp: false,
          timestamp: Date.now(),
        });
      }).toThrow("Backup file not found");
    } finally {
      rmSync(testDir, { recursive: true, force: true });
    }
  });
});
