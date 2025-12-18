// API routes handler

import type { IncomingMessage, ServerResponse } from "node:http";
import { join } from "node:path";
import type { Config, EventService } from "../types";
import {
  handleCreateHighlight,
  handleDeleteHighlight,
  handleGetDirectoryHighlights,
  handleGetResourceHighlights,
  handleRestoreFile,
} from "./highlights";

// Context for route handlers
type RouteContext = {
  req: IncomingMessage;
  res: ServerResponse;
  pathname: string;
  url: URL;
  config: Config;
  eventService: EventService | null;
};

// Helper: send JSON response
const sendJson = (res: ServerResponse, statusCode: number, data: unknown): void => {
  res.writeHead(statusCode, { "Content-Type": "application/json" });
  res.end(JSON.stringify(data));
};

// Helper: send response
const sendResponse = (
  res: ServerResponse,
  statusCode: number,
  headers: Record<string, string>,
  body: string
): void => {
  res.writeHead(statusCode, headers);
  res.end(body);
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

// Handle events API routes
const handleEventsRoute = async (ctx: RouteContext): Promise<boolean> => {
  if (ctx.pathname !== "/api/events" || ctx.req.method !== "POST") {
    return false;
  }

  if (!ctx.eventService) {
    sendResponse(ctx.res, 501, { "Content-Type": "text/plain" }, "Events disabled");
    return true;
  }

  try {
    const body = (await parseJsonBody(ctx.req)) as {
      type: "view" | "open";
      path: string;
      resourceType: "file" | "dir";
    };

    const absolutePath = body.path.startsWith("/")
      ? body.path
      : join(ctx.config.directory, body.path);

    ctx.eventService.recordEvent(body.type, absolutePath, body.resourceType);
    sendResponse(ctx.res, 204, {}, "");
    return true;
  } catch (err) {
    console.error("[events] Failed to record event:", err);
    sendResponse(ctx.res, 400, { "Content-Type": "text/plain" }, "Invalid request");
    return true;
  }
};

// Handle analytics API routes
const handleAnalyticsRoute = async (ctx: RouteContext): Promise<boolean> => {
  // Analytics data endpoint
  if (ctx.pathname === "/api/analytics" && ctx.req.method === "GET") {
    if (!ctx.eventService) {
      sendJson(ctx.res, 501, { error: "Events disabled" });
      return true;
    }

    try {
      const directory = ctx.url.searchParams.get("directory") || undefined;
      const analytics = await ctx.eventService.getAnalytics(directory);
      sendJson(ctx.res, 200, analytics);
      return true;
    } catch (err) {
      console.error("[events] Failed to get analytics:", err);
      sendJson(ctx.res, 500, { error: "Failed to get analytics" });
      return true;
    }
  }

  // Analytics timeseries endpoint
  if (ctx.pathname === "/api/analytics/timeseries" && ctx.req.method === "GET") {
    if (!ctx.eventService) {
      sendJson(ctx.res, 501, { error: "Events disabled" });
      return true;
    }

    try {
      const directory = ctx.url.searchParams.get("directory");
      const days = Number.parseInt(ctx.url.searchParams.get("days") || "7", 10);
      const timeSeries = await ctx.eventService.getActivityTimeSeries(directory, days);
      sendJson(ctx.res, 200, timeSeries);
      return true;
    } catch (err) {
      console.error("[events] Failed to get timeseries:", err);
      sendJson(ctx.res, 500, { error: "Failed to get timeseries" });
      return true;
    }
  }

  return false;
};

// Handle highlights API routes
const handleHighlightsRoute = async (ctx: RouteContext): Promise<boolean> => {
  if (!ctx.pathname.startsWith("/api/highlights")) {
    return false;
  }

  if (!ctx.eventService) {
    sendResponse(ctx.res, 501, { "Content-Type": "text/plain" }, "Events disabled");
    return true;
  }

  const db = ctx.eventService.getDatabase();

  // Create highlight
  if (ctx.pathname === "/api/highlights" && ctx.req.method === "POST") {
    await handleCreateHighlight(ctx.req, ctx.res, { config: ctx.config, db });
    return true;
  }

  // Get highlights by resource
  if (ctx.pathname === "/api/highlights/resource" && ctx.req.method === "GET") {
    handleGetResourceHighlights(ctx.res, { config: ctx.config, db }, ctx.url);
    return true;
  }

  // Get highlights by directory
  if (ctx.pathname === "/api/highlights/directory" && ctx.req.method === "GET") {
    handleGetDirectoryHighlights(ctx.res, { config: ctx.config, db }, ctx.url);
    return true;
  }

  // Delete highlight
  if (ctx.pathname.startsWith("/api/highlights/") && ctx.req.method === "DELETE") {
    const highlightId = ctx.pathname.slice(17);
    if (!highlightId || highlightId.includes("/")) {
      sendResponse(ctx.res, 400, { "Content-Type": "text/plain" }, "Invalid highlight ID");
      return true;
    }

    handleDeleteHighlight(ctx.res, { config: ctx.config, db }, highlightId);
    return true;
  }

  // Export highlights
  if (ctx.pathname === "/api/highlights/export" && ctx.req.method === "POST") {
    const { handleExportHighlights } = await import("./highlights");
    await handleExportHighlights(ctx.req, ctx.res, { config: ctx.config, db });
    return true;
  }

  // Restore file from backup
  const isRestoreRoute =
    ctx.pathname.startsWith("/api/highlights/") && ctx.pathname.endsWith("/restore");
  if (isRestoreRoute && ctx.req.method === "POST") {
    const parts = ctx.pathname.slice(17).split("/");
    const highlightId = parts[0];
    if (!highlightId || parts.length !== 2) {
      sendResponse(ctx.res, 400, { "Content-Type": "text/plain" }, "Invalid highlight ID");
      return true;
    }

    await handleRestoreFile(ctx.req, ctx.res, { config: ctx.config, db }, highlightId);
    return true;
  }

  return false;
};

// Main API router - dispatches to specific route handlers
export const handleApiRoute = async (
  req: IncomingMessage,
  res: ServerResponse,
  pathname: string,
  url: URL,
  config: Config,
  eventService: EventService | null
): Promise<boolean> => {
  if (!pathname.startsWith("/api/")) {
    return false;
  }

  const ctx: RouteContext = { req, res, pathname, url, config, eventService };

  // Try each route handler
  if (await handleEventsRoute(ctx)) {
    return true;
  }
  if (await handleAnalyticsRoute(ctx)) {
    return true;
  }
  if (await handleHighlightsRoute(ctx)) {
    return true;
  }

  return false;
};
