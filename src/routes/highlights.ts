// API routes for highlights management

import { readFileSync } from "node:fs";
import type { IncomingMessage, ServerResponse } from "node:http";
import { join } from "node:path";
import {
  backupFile,
  computeFileHash,
  createHighlight,
  deleteHighlight,
  deleteInvalidHighlights,
  generateMarkdownExport,
  getHighlightsByDirectory,
  getHighlightsByResource,
  getResourceByPath,
  markHighlightStale,
  restoreFile,
  updateHighlight,
  updateResourceBackup,
  validateHighlight,
  writeMarkdownExport,
} from "../highlights";
import type { Config } from "../types";

// Context object for route handlers
type RouteContext = {
  config: Config;
  // biome-ignore lint/suspicious/noExplicitAny: Runtime compatibility layer
  db: any;
};

// Helper: send JSON response
const sendJson = (res: ServerResponse, statusCode: number, data: unknown): void => {
  res.writeHead(statusCode, { "Content-Type": "application/json" });
  res.end(JSON.stringify(data));
};

// Helper: parse JSON body
const parseJsonBody = async (req: IncomingMessage): Promise<unknown> =>
  new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk.toString();
    });
    req.on("end", () => {
      try {
        resolve(JSON.parse(body));
      } catch (err) {
        reject(err);
      }
    });
    req.on("error", reject);
  });

// POST /api/highlights - Create a new highlight
export const handleCreateHighlight = async (
  req: IncomingMessage,
  res: ServerResponse,
  ctx: RouteContext
): Promise<void> => {
  try {
    const body = (await parseJsonBody(req)) as {
      resourcePath: string;
      highlightedText: string;
      occurrenceIndex?: number;
      notes?: string;
    };

    // Validate required fields
    const hasRequiredFields = body.resourcePath && body.highlightedText;

    if (!hasRequiredFields) {
      sendJson(res, 400, { error: "Missing required fields" });
      return;
    }

    // Convert relative path to absolute
    const absolutePath = body.resourcePath.startsWith("/")
      ? body.resourcePath
      : join(ctx.config.directory, body.resourcePath);

    // Get or create resource
    const resource = getResourceByPath(ctx.db, absolutePath);
    if (!resource) {
      sendJson(res, 404, { error: "Resource not found" });
      return;
    }

    // Read file content (markdown source) and compute hash
    const fileContent = readFileSync(absolutePath, "utf-8");
    const contentHash = computeFileHash(fileContent);

    // Calculate offsets from the markdown source with occurrence index
    const { findTextOffset } = await import("../highlights");
    const occurrenceIndex = body.occurrenceIndex ?? 0;
    const offsets = findTextOffset(fileContent, body.highlightedText, occurrenceIndex);

    if (!offsets) {
      sendJson(res, 400, {
        error:
          "Could not locate text in source file. Text may not exist at the specified occurrence.",
      });
      return;
    }

    // Verify the text matches exactly (or with normalized whitespace)
    const extractedText = fileContent.slice(offsets.startOffset, offsets.endOffset);
    const normalizeWhitespace = (text: string) => text.replace(/\s+/g, " ").trim();

    // Check if text is fundamentally different (not just whitespace)
    let isStale = false;
    const exactMatch = extractedText === body.highlightedText;
    if (!exactMatch) {
      const whitespaceOnlyDiff =
        normalizeWhitespace(extractedText) === normalizeWhitespace(body.highlightedText);
      isStale = !whitespaceOnlyDiff;
    }

    // Create backup if this is the first highlight for this resource
    if (!resource.backupPath) {
      const timestamp = Date.now();
      const backupPath = backupFile(absolutePath, resource.id, timestamp);
      updateResourceBackup(ctx.db, resource.id, contentHash, backupPath);
    }

    // Create highlight with offsets calculated from markdown source
    const highlightId = createHighlight({
      db: ctx.db,
      resourceId: resource.id,
      startOffset: offsets.startOffset,
      endOffset: offsets.endOffset,
      highlightedText: body.highlightedText,
      contentHash,
      notes: body.notes,
    });

    // Mark as stale if needed
    if (isStale) {
      markHighlightStale(ctx.db, highlightId);
    }

    sendJson(res, 201, { id: highlightId, isStale });
  } catch (err) {
    console.error("[highlights] Failed to create highlight:", err);
    sendJson(res, 500, { error: "Failed to create highlight" });
  }
};

// Helper: validate and update highlights for a resource
const validateResourceHighlights = (
  db: any,
  highlights: Array<{
    id: string;
    startOffset: number;
    endOffset: number;
    highlightedText: string;
    contentHash: string;
    isStale: boolean;
    createdAt: number;
    updatedAt: number;
  }>,
  fileContent: string
): void => {
  for (const highlight of highlights) {
    if (highlight.isStale) {
      continue; // Already marked as stale
    }

    const validation = validateHighlight({
      content: fileContent,
      contentHash: highlight.contentHash,
      startOffset: highlight.startOffset,
      endOffset: highlight.endOffset,
      highlightedText: highlight.highlightedText,
    });

    if (!validation.isValid) {
      markHighlightStale(db, highlight.id);
      highlight.isStale = true;
    } else if (validation.newStartOffset !== undefined) {
      // Update offsets if text was found at new location
      updateHighlight({
        db,
        highlightId: highlight.id,
        startOffset: validation.newStartOffset,
        endOffset: validation.newEndOffset as number,
        contentHash: validation.newContentHash as string,
      });
      highlight.startOffset = validation.newStartOffset;
      highlight.endOffset = validation.newEndOffset as number;
      highlight.contentHash = validation.newContentHash as string;
    }
  }
};

// GET /api/highlights/resource?path=... - Get highlights for a resource
export const handleGetResourceHighlights = (
  res: ServerResponse,
  ctx: RouteContext,
  url: URL
): void => {
  try {
    const resourcePath = url.searchParams.get("path");
    if (!resourcePath) {
      sendJson(res, 400, { error: "Missing path parameter" });
      return;
    }

    // Convert relative path to absolute
    const absolutePath = resourcePath.startsWith("/")
      ? resourcePath
      : join(ctx.config.directory, resourcePath);

    // Get resource
    const resource = getResourceByPath(ctx.db, absolutePath);
    if (!resource) {
      sendJson(res, 404, { error: "Resource not found" });
      return;
    }

    // Clean up and get highlights for resource
    try {
      const fileContent = readFileSync(absolutePath, "utf-8");

      // Delete highlights where text no longer exists
      const deletedCount = deleteInvalidHighlights(ctx.db, resource.id, fileContent);
      if (deletedCount > 0) {
        console.log(
          `[highlights] Deleted ${deletedCount} invalid highlight(s) from ${resourcePath}`
        );
      }
    } catch {
      // File doesn't exist or can't be read - delete all highlights for this resource
      const highlights = getHighlightsByResource(ctx.db, resource.id);
      for (const highlight of highlights) {
        deleteHighlight(ctx.db, highlight.id);
      }
      sendJson(res, 200, { highlights: [] });
      return;
    }

    // Get remaining highlights after cleanup
    const highlights = getHighlightsByResource(ctx.db, resource.id);
    sendJson(res, 200, { highlights });
  } catch (err) {
    console.error("[highlights] Failed to get resource highlights:", err);
    sendJson(res, 500, { error: "Failed to get resource highlights" });
  }
};

// GET /api/highlights/directory?path=... - Get highlights for a directory
export const handleGetDirectoryHighlights = (
  res: ServerResponse,
  ctx: RouteContext,
  url: URL
): void => {
  try {
    const directoryPath = url.searchParams.get("path") || ctx.config.directory;

    // Convert relative path to absolute
    const absolutePath = directoryPath.startsWith("/")
      ? directoryPath
      : join(ctx.config.directory, directoryPath);

    // Get highlights for directory
    const highlights = getHighlightsByDirectory(ctx.db, absolutePath);

    sendJson(res, 200, { highlights });
  } catch (err) {
    console.error("[highlights] Failed to get directory highlights:", err);
    sendJson(res, 500, { error: "Failed to get directory highlights" });
  }
};

// DELETE /api/highlights/:id - Delete a highlight
export const handleDeleteHighlight = (
  res: ServerResponse,
  ctx: RouteContext,
  highlightId: string
): void => {
  try {
    if (!highlightId) {
      sendJson(res, 400, { error: "Missing highlight ID" });
      return;
    }

    deleteHighlight(ctx.db, highlightId);
    sendJson(res, 204, {});
  } catch (err) {
    console.error("[highlights] Failed to delete highlight:", err);
    sendJson(res, 500, { error: "Failed to delete highlight" });
  }
};

// POST /api/highlights/:id/restore - Restore file from backup
export const handleRestoreFile = async (
  req: IncomingMessage,
  res: ServerResponse,
  ctx: RouteContext,
  highlightId: string
): Promise<void> => {
  try {
    if (!highlightId) {
      sendJson(res, 400, { error: "Missing highlight ID" });
      return;
    }

    const body = (await parseJsonBody(req)) as {
      useTimestamp?: boolean;
    };

    // Get highlight to find the resource
    const stmt = ctx.db.prepare(`
      SELECT h.resource_id, h.created_at, r.path, r.backup_path
      FROM highlights h
      JOIN resources r ON h.resource_id = r.id
      WHERE h.id = ?
    `);

    const result = stmt.get(highlightId) as
      | {
          resource_id: string;
          created_at: number;
          path: string;
          backup_path: string | null;
        }
      | undefined;

    const hasBackup = result?.backup_path;
    if (!hasBackup) {
      sendJson(res, 404, { error: "Highlight or backup not found" });
      return;
    }

    // Restore the file
    const restoredPath = restoreFile({
      backupPath: hasBackup,
      originalPath: result.path,
      useTimestamp: body.useTimestamp ?? false,
      timestamp: result.created_at,
    });

    // If a timestamped copy was created, we need to create a new resource
    if (restoredPath !== result.path) {
      const { randomUUID } = await import("node:crypto");
      const newResourceId = randomUUID();
      const timestamp = Date.now();

      const insertStmt = ctx.db.prepare(
        "INSERT INTO resources (id, path, type, created_at) VALUES (?, ?, ?, ?)"
      );
      insertStmt.run(newResourceId, restoredPath, "file", timestamp);
    }

    sendJson(res, 200, { restoredPath });
  } catch (err) {
    console.error("[highlights] Failed to restore file:", err);
    sendJson(res, 500, { error: "Failed to restore file" });
  }
};

// POST /api/highlights/export - Export highlights to markdown
export const handleExportHighlights = async (
  req: IncomingMessage,
  res: ServerResponse,
  ctx: RouteContext
): Promise<void> => {
  try {
    const body = (await parseJsonBody(req)) as {
      directory?: string;
    };

    const targetDirectory = body.directory || ctx.config.directory;

    // Get highlights for directory
    const highlights = getHighlightsByDirectory(ctx.db, targetDirectory);

    if (highlights.length === 0) {
      sendJson(res, 400, { error: "No highlights to export" });
      return;
    }

    // Generate filename: nameOfDirectory-YYYY-MM-DD.md
    const dateStr = new Date().toISOString().replace(/[:.]/g, "-").split("T")[0];
    const { basename } = await import("node:path");
    const dirName = basename(targetDirectory);
    const filename = `${dirName}-${dateStr}.md`;

    // Generate and write export
    const content = generateMarkdownExport(highlights, targetDirectory);
    const exportPath = writeMarkdownExport(content, filename);

    sendJson(res, 200, { filePath: exportPath, filename, count: highlights.length });
  } catch (err) {
    console.error("[highlights] Failed to export highlights:", err);
    sendJson(res, 500, { error: "Failed to export highlights" });
  }
};
