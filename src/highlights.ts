// Highlights service for managing text selections and file backups

import { createHash, randomUUID } from "node:crypto";
import { copyFileSync, existsSync, mkdirSync } from "node:fs";
import { homedir } from "node:os";
import { basename, dirname, join } from "node:path";

const MD_EXTENSION_REGEX = /\.md$/;

// Pure function: generate UUID v4
const generateId = (): string => randomUUID();

// Pure function: compute SHA-256 hash of file content
export const computeFileHash = (content: string): string =>
  createHash("sha256").update(content, "utf8").digest("hex");

// Pure function: resolve cache directory path using XDG_CACHE_HOME or fallback
export const resolveCacheDirectory = (): string => {
  const xdgCacheHome = process.env.XDG_CACHE_HOME;
  const baseDir = xdgCacheHome || join(homedir(), ".cache");
  const llmdCacheDir = join(baseDir, "llmd", "file-backups");

  return llmdCacheDir;
};

// Side effect: ensure cache directory exists
const ensureCacheDirectory = (): string => {
  const cacheDir = resolveCacheDirectory();

  if (!existsSync(cacheDir)) {
    mkdirSync(cacheDir, { recursive: true });
  }

  return cacheDir;
};

// Side effect: backup file to cache directory
// Returns the backup file path
export const backupFile = (filePath: string, resourceId: string, timestamp: number): string => {
  const cacheDir = ensureCacheDirectory();
  const fileName = basename(filePath);
  const backupFileName = `${resourceId}_${timestamp}_${fileName}`;
  const backupPath = join(cacheDir, backupFileName);

  copyFileSync(filePath, backupPath);

  return backupPath;
};

// Side effect: restore file from backup
// Parameters:
//   backupPath: path to backup file
//   originalPath: original file path
//   useTimestamp: if true, create timestamped copy; if false, replace original
//   timestamp: timestamp to use in filename
export const restoreFile = (params: {
  backupPath: string;
  originalPath: string;
  useTimestamp: boolean;
  timestamp: number;
}): string => {
  if (!existsSync(params.backupPath)) {
    throw new Error(`Backup file not found: ${params.backupPath}`);
  }

  let targetPath = params.originalPath;

  if (params.useTimestamp) {
    const dirPath = dirname(params.originalPath);
    const fileName = basename(params.originalPath);
    const nameWithoutExt = fileName.replace(MD_EXTENSION_REGEX, "");
    const timestampStr = new Date(params.timestamp).toISOString().replace(/[:.]/g, "-");
    targetPath = join(dirPath, `${nameWithoutExt}_${timestampStr}.md`);
  }

  // Ensure target directory exists
  const targetDir = dirname(targetPath);
  if (!existsSync(targetDir)) {
    mkdirSync(targetDir, { recursive: true });
  }

  copyFileSync(params.backupPath, targetPath);

  return targetPath;
};

// Pure function: find text in content and return offset
// Returns null if text not found or if there are multiple matches
export const findTextOffset = (
  content: string,
  searchText: string
): { startOffset: number; endOffset: number } | null => {
  const firstIndex = content.indexOf(searchText);

  if (firstIndex === -1) {
    return null; // Not found
  }

  // Check for multiple occurrences
  const lastIndex = content.lastIndexOf(searchText);
  if (firstIndex !== lastIndex) {
    return null; // Multiple matches - ambiguous
  }

  return {
    startOffset: firstIndex,
    endOffset: firstIndex + searchText.length,
  };
};

// Pure function: extract text from content using offsets
export const extractTextByOffset = (
  content: string,
  startOffset: number,
  endOffset: number
): string => content.substring(startOffset, endOffset);

// Pure function: check if highlight is still valid
// Returns updated offsets if found, or null if stale
export const validateHighlight = (params: {
  content: string;
  contentHash: string;
  startOffset: number;
  endOffset: number;
  highlightedText: string;
}): {
  isValid: boolean;
  newStartOffset?: number;
  newEndOffset?: number;
  newContentHash?: string;
} => {
  const currentHash = computeFileHash(params.content);

  // If hash matches, offsets are still valid
  if (currentHash === params.contentHash) {
    return { isValid: true };
  }

  // Hash changed - try to find the text in new content
  const newOffsets = findTextOffset(params.content, params.highlightedText);

  if (newOffsets === null) {
    // Text not found or ambiguous - highlight is stale
    return { isValid: false };
  }

  // Text found - update offsets and hash
  return {
    isValid: true,
    newStartOffset: newOffsets.startOffset,
    newEndOffset: newOffsets.endOffset,
    newContentHash: currentHash,
  };
};

// Side effect: initialize highlights schema in database
// biome-ignore lint/suspicious/noExplicitAny: Runtime compatibility layer
export const initializeHighlightsSchema = (db: any): void => {
  // Add content_hash and backup_path columns to resources table if they don't exist
  try {
    db.exec(`
      ALTER TABLE resources ADD COLUMN content_hash TEXT;
    `);
  } catch {
    // Column already exists - ignore error
  }

  try {
    db.exec(`
      ALTER TABLE resources ADD COLUMN backup_path TEXT;
    `);
  } catch {
    // Column already exists - ignore error
  }

  // Create highlights table
  db.exec(`
    CREATE TABLE IF NOT EXISTS highlights (
      id TEXT PRIMARY KEY,
      resource_id TEXT NOT NULL,
      start_offset INTEGER NOT NULL,
      end_offset INTEGER NOT NULL,
      highlighted_text TEXT NOT NULL,
      content_hash TEXT NOT NULL,
      is_stale INTEGER NOT NULL DEFAULT 0 CHECK(is_stale IN (0, 1)),
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      FOREIGN KEY (resource_id) REFERENCES resources(id) ON DELETE CASCADE
    );
  `);

  // Create indexes for highlights
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_highlights_resource_id ON highlights(resource_id);
    CREATE INDEX IF NOT EXISTS idx_highlights_is_stale ON highlights(is_stale);
    CREATE INDEX IF NOT EXISTS idx_highlights_created_at ON highlights(created_at);
  `);

  // Add notes column if it doesn't exist (migration for existing databases)
  try {
    db.exec("ALTER TABLE highlights ADD COLUMN notes TEXT");
  } catch {
    // Column already exists, ignore error
  }
};

// Pure function: get directory path from file path
export const getDirectoryPath = (filePath: string): string => dirname(filePath);

// Side effect: create highlight in database
// Parameters: db, resource metadata, offsets, text, hash, optional notes
// biome-ignore lint/suspicious/noExplicitAny: Runtime compatibility layer
export const createHighlight = (params: {
  db: any;
  resourceId: string;
  startOffset: number;
  endOffset: number;
  highlightedText: string;
  contentHash: string;
  notes?: string;
}): string => {
  const highlightId = generateId();
  const timestamp = Date.now();

  const stmt = params.db.prepare(`
    INSERT INTO highlights (
      id, resource_id, start_offset, end_offset, 
      highlighted_text, content_hash, is_stale, 
      notes, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?, ?)
  `);

  stmt.run(
    highlightId,
    params.resourceId,
    params.startOffset,
    params.endOffset,
    params.highlightedText,
    params.contentHash,
    params.notes || null,
    timestamp,
    timestamp
  );

  return highlightId;
};

// Side effect: get highlights for a resource
// biome-ignore lint/suspicious/noExplicitAny: Runtime compatibility layer
export const getHighlightsByResource = (
  db: any,
  resourceId: string
): Array<{
  id: string;
  startOffset: number;
  endOffset: number;
  highlightedText: string;
  contentHash: string;
  isStale: boolean;
  notes: string | null;
  createdAt: number;
  updatedAt: number;
}> => {
  const stmt = db.prepare(`
    SELECT 
      id, start_offset, end_offset, highlighted_text, 
      content_hash, is_stale, notes, created_at, updated_at
    FROM highlights
    WHERE resource_id = ?
    ORDER BY start_offset ASC
  `);

  const results = stmt.all(resourceId) as Array<{
    id: string;
    start_offset: number;
    end_offset: number;
    highlighted_text: string;
    content_hash: string;
    is_stale: number;
    notes: string | null;
    created_at: number;
    updated_at: number;
  }>;

  return results.map((row) => ({
    id: row.id,
    startOffset: row.start_offset,
    endOffset: row.end_offset,
    highlightedText: row.highlighted_text,
    contentHash: row.content_hash,
    isStale: row.is_stale === 1,
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));
};

// Side effect: get highlights for a directory
// biome-ignore lint/suspicious/noExplicitAny: Runtime compatibility layer
export const getHighlightsByDirectory = (
  db: any,
  directoryPath: string
): Array<{
  id: string;
  resourceId: string;
  resourcePath: string;
  startOffset: number;
  endOffset: number;
  highlightedText: string;
  contentHash: string;
  isStale: boolean;
  notes: string | null;
  createdAt: number;
  updatedAt: number;
}> => {
  const stmt = db.prepare(`
    SELECT 
      h.id, h.resource_id, r.path as resource_path,
      h.start_offset, h.end_offset, h.highlighted_text, 
      h.content_hash, h.is_stale, h.notes, h.created_at, h.updated_at
    FROM highlights h
    JOIN resources r ON h.resource_id = r.id
    WHERE r.path LIKE ?
    ORDER BY h.created_at DESC
  `);

  const results = stmt.all(`${directoryPath}%`) as Array<{
    id: string;
    resource_id: string;
    resource_path: string;
    start_offset: number;
    end_offset: number;
    highlighted_text: string;
    content_hash: string;
    is_stale: number;
    notes: string | null;
    created_at: number;
    updated_at: number;
  }>;

  return results.map((row) => ({
    id: row.id,
    resourceId: row.resource_id,
    resourcePath: row.resource_path,
    startOffset: row.start_offset,
    endOffset: row.end_offset,
    highlightedText: row.highlighted_text,
    contentHash: row.content_hash,
    isStale: row.is_stale === 1,
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));
};

// Side effect: mark highlight as stale
// biome-ignore lint/suspicious/noExplicitAny: Runtime compatibility layer
export const markHighlightStale = (db: any, highlightId: string): void => {
  const stmt = db.prepare(`
    UPDATE highlights 
    SET is_stale = 1, updated_at = ?
    WHERE id = ?
  `);

  stmt.run(Date.now(), highlightId);
};

// Side effect: update highlight offsets and hash
// Parameters: db, highlight ID, new offsets, new hash
// biome-ignore lint/suspicious/noExplicitAny: Runtime compatibility layer
export const updateHighlight = (params: {
  db: any;
  highlightId: string;
  startOffset: number;
  endOffset: number;
  contentHash: string;
}): void => {
  const stmt = params.db.prepare(`
    UPDATE highlights 
    SET start_offset = ?, end_offset = ?, content_hash = ?, 
        is_stale = 0, updated_at = ?
    WHERE id = ?
  `);

  stmt.run(
    params.startOffset,
    params.endOffset,
    params.contentHash,
    Date.now(),
    params.highlightId
  );
};

// Side effect: delete highlight
// biome-ignore lint/suspicious/noExplicitAny: Runtime compatibility layer
export const deleteHighlight = (db: any, highlightId: string): void => {
  const stmt = db.prepare("DELETE FROM highlights WHERE id = ?");
  stmt.run(highlightId);
};

// Side effect: update resource with content hash and backup path
// biome-ignore lint/suspicious/noExplicitAny: Runtime compatibility layer
export const updateResourceBackup = (
  db: any,
  resourceId: string,
  contentHash: string,
  backupPath: string
): void => {
  const stmt = db.prepare(`
    UPDATE resources 
    SET content_hash = ?, backup_path = ?
    WHERE id = ?
  `);

  stmt.run(contentHash, backupPath, resourceId);
};

// Side effect: get resource by path
// biome-ignore lint/suspicious/noExplicitAny: Runtime compatibility layer
export const getResourceByPath = (
  db: any,
  path: string
): {
  id: string;
  path: string;
  type: string;
  contentHash: string | null;
  backupPath: string | null;
  createdAt: number;
} | null => {
  const stmt = db.prepare(`
    SELECT id, path, type, content_hash, backup_path, created_at
    FROM resources
    WHERE path = ?
  `);

  const result = stmt.get(path) as
    | {
        id: string;
        path: string;
        type: string;
        content_hash: string | null;
        backup_path: string | null;
        created_at: number;
      }
    | undefined;

  if (!result) {
    return null;
  }

  return {
    id: result.id,
    path: result.path,
    type: result.type,
    contentHash: result.content_hash,
    backupPath: result.backup_path,
    createdAt: result.created_at,
  };
};

// Side effect: check if directory has highlights
// biome-ignore lint/suspicious/noExplicitAny: Runtime compatibility layer
export const directoryHasHighlights = (db: any, directoryPath: string): boolean => {
  const stmt = db.prepare(`
    SELECT COUNT(*) as count
    FROM highlights h
    JOIN resources r ON h.resource_id = r.id
    WHERE r.path LIKE ?
  `);

  const result = stmt.get(`${directoryPath}%`) as { count: number };
  return result.count > 0;
};

// Pure function: format timestamp as ISO date string
const formatIsoDate = (timestamp: number): string => new Date(timestamp).toISOString();

// Pure function: generate markdown export content from highlights
export const generateMarkdownExport = (
  highlights: Array<{
    resourcePath: string;
    highlightedText: string;
    notes: string | null;
    createdAt: number;
  }>,
  directoryPath: string
): string => {
  const timestamp = formatIsoDate(Date.now());
  const header = `# Highlights Export\n\n**Directory:** ${directoryPath}\n**Exported:** ${timestamp}\n**Total Highlights:** ${highlights.length}\n\n---\n\n`;

  const highlightBlocks = highlights
    .map((h) => {
      const fileName = basename(h.resourcePath);
      const date = formatIsoDate(h.createdAt);
      const notesSection = h.notes ? `\n\n**Note:**\n${h.notes}\n` : "";

      return `## ${fileName}\n\n**Created:** ${date}\n\n> ${h.highlightedText}${notesSection}`;
    })
    .join("\n\n---\n\n");

  return header + highlightBlocks;
};

// Side effect: write markdown export to file
// Returns the absolute path of the written file
export const writeMarkdownExport = (content: string, filename: string): string => {
  const { ensureExportsDirectory } = require("./config");
  const { writeFileSync } = require("node:fs");

  const exportsDir = ensureExportsDirectory();
  const filePath = join(exportsDir, filename);

  writeFileSync(filePath, content, "utf-8");

  return filePath;
};
