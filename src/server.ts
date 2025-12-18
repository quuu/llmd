// HTTP server using Node.js http + ws

import { readFile } from "node:fs/promises";
import { createServer } from "node:http";
import { join } from "node:path";
import type { WebSocket } from "ws";
import { WebSocketServer } from "ws";
import { getClientScriptTag } from "./client-assets";
import { initEventService } from "./events";
import { processMarkdown } from "./markdown";
import { generateErrorPage, generateIndexPage, generateMarkdownPage } from "./template";
import type { Config, EventService, MarkdownFile } from "./types";
import { unwatchFile, watchFile } from "./watcher";

// Pure function: create HTML response headers with cache control
const htmlHeaders = (): Record<string, string> => ({
  "Content-Type": "text/html",
  "Cache-Control": "no-cache, no-store, must-revalidate",
  Pragma: "no-cache",
  Expires: "0",
});

// Pure function: parse URL path to extract file path
const parseViewPath = (pathname: string): string | null => {
  if (!pathname.startsWith("/view/")) {
    return null;
  }

  const filePath = pathname.slice(6); // Remove "/view/"
  return filePath.endsWith(".md") ? filePath : null;
};

// Side effect: read markdown file
const readMarkdownFile = async (rootDir: string, relativePath: string): Promise<string | null> => {
  try {
    const fullPath = join(rootDir, relativePath);
    const content = await readFile(fullPath, "utf-8");
    return content;
  } catch {
    return null;
  }
};

// Helper: send response
const sendResponse = (
  res: import("node:http").ServerResponse,
  statusCode: number,
  headers: Record<string, string>,
  body: string
): void => {
  res.writeHead(statusCode, headers);
  res.end(body);
};

// Regex for matching .md extension (top-level to avoid re-creation)
const MD_EXTENSION = /\.md$/;

// Helper: extract theme/font from filename (for preview mode)
// Format: theme-font.md (e.g., "dark-modern.md", "nord-classic.md")
//
// IMPORTANT: This extraction ALWAYS takes precedence over CLI flags when a match is found.
// This enables the preview generation workflow where each file demonstrates a different theme/font:
// - "nord-modern.md" → forces nord theme + modern font
// - "dark.md" → only extracts theme (font falls back to CLI or default)
// - "modern.md" → only extracts font (theme falls back to CLI or default)
// - "preview-1.md" → no extraction (CLI flags apply to all files)
//
// See scripts/generate-preview.ts for the preview generation workflow.
const extractPreviewConfig = (filename: string): { theme?: string; font?: string } | null => {
  // Remove .md extension
  const nameWithoutExt = filename.replace(MD_EXTENSION, "");

  // Check if it matches theme-font pattern
  const parts = nameWithoutExt.split("-");
  if (parts.length === 2) {
    const [theme, font] = parts;
    return { theme, font };
  }

  return null;
};

// Helper: handle markdown file view
const handleMarkdownView = async (
  viewPath: string,
  config: Config,
  files: MarkdownFile[],
  clientScript: string,
  res: import("node:http").ServerResponse
): Promise<void> => {
  const markdown = await readMarkdownFile(config.directory, viewPath);

  if (!markdown) {
    const html = generateErrorPage({
      errorCode: 404,
      message: `File not found: ${viewPath}`,
      files,
      config,
      clientScript,
    });
    sendResponse(res, 404, htmlHeaders(), html);
    return;
  }

  try {
    // Check if this is a preview file and extract theme/font from filename
    const filename = viewPath.split("/").pop() ?? viewPath;
    const previewConfig = extractPreviewConfig(filename);

    // Override config with preview settings if detected
    const renderConfig = previewConfig
      ? {
          ...config,
          theme: previewConfig.theme ?? config.theme,
          fontTheme: previewConfig.font ?? config.fontTheme,
        }
      : config;

    const { html, toc } = await processMarkdown(markdown, renderConfig.theme);
    const page = generateMarkdownPage({
      html,
      toc,
      fileName: filename,
      files,
      config: renderConfig,
      currentPath: viewPath,
      clientScript,
    });

    sendResponse(res, 200, htmlHeaders(), page);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to render markdown";
    const errorHtml = generateErrorPage({
      errorCode: 500,
      message,
      files,
      config,
      clientScript,
    });
    sendResponse(res, 500, htmlHeaders(), errorHtml);
  }
};

// Helper: parse JSON body from request
const parseJsonBody = (req: import("node:http").IncomingMessage): Promise<unknown> =>
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

// Pure function: create request handler (returns handler with side effects)
const createHandler = (
  config: Config,
  files: MarkdownFile[],
  clientScript: string,
  eventService: EventService | null
) => {
  return async (
    req: import("node:http").IncomingMessage,
    res: import("node:http").ServerResponse
  ): Promise<void> => {
    const url = new URL(req.url ?? "/", `http://${req.headers.host}`);
    const pathname = url.pathname;

    // Log HTTP request (only for markdown files and home page)
    const shouldLog = pathname === "/" || pathname.startsWith("/view/");
    if (shouldLog) {
      const timestamp = new Date().toISOString().split("T")[1]?.split(".")[0];
      console.log(`[${timestamp}] ${req.method} ${pathname}`);
    }

    // Route: POST /api/events - Record event
    if (pathname === "/api/events" && req.method === "POST") {
      if (!eventService) {
        sendResponse(res, 501, { "Content-Type": "text/plain" }, "Events disabled");
        return;
      }

      try {
        const body = (await parseJsonBody(req)) as {
          type: "view" | "open";
          path: string;
          resourceType: "file" | "dir";
        };

        // Convert relative path to absolute
        const absolutePath = body.path.startsWith("/")
          ? body.path
          : join(config.directory, body.path);

        eventService.recordEvent(body.type, absolutePath, body.resourceType);
        sendResponse(res, 204, {}, "");
        return;
      } catch (err) {
        console.error("[events] Failed to record event:", err);
        sendResponse(res, 400, { "Content-Type": "text/plain" }, "Invalid request");
        return;
      }
    }

    // Route: GET /api/analytics - Get analytics data
    if (pathname === "/api/analytics" && req.method === "GET") {
      if (!eventService) {
        sendResponse(
          res,
          501,
          { "Content-Type": "application/json" },
          JSON.stringify({ error: "Events disabled" })
        );
        return;
      }

      try {
        const directory = url.searchParams.get("directory") || undefined;
        const analytics = await eventService.getAnalytics(directory);
        sendResponse(res, 200, { "Content-Type": "application/json" }, JSON.stringify(analytics));
        return;
      } catch (err) {
        console.error("[events] Failed to get analytics:", err);
        sendResponse(
          res,
          500,
          { "Content-Type": "application/json" },
          JSON.stringify({ error: "Failed to get analytics" })
        );
        return;
      }
    }

    // Route: GET /api/analytics/timeseries - Get time series data
    if (pathname === "/api/analytics/timeseries" && req.method === "GET") {
      if (!eventService) {
        sendResponse(
          res,
          501,
          { "Content-Type": "application/json" },
          JSON.stringify({ error: "Events disabled" })
        );
        return;
      }

      try {
        const directory = url.searchParams.get("directory");
        const days = Number.parseInt(url.searchParams.get("days") || "7", 10);
        const timeSeries = await eventService.getActivityTimeSeries(directory, days);
        sendResponse(res, 200, { "Content-Type": "application/json" }, JSON.stringify(timeSeries));
        return;
      } catch (err) {
        console.error("[events] Failed to get timeseries:", err);
        sendResponse(
          res,
          500,
          { "Content-Type": "application/json" },
          JSON.stringify({ error: "Failed to get timeseries" })
        );
        return;
      }
    }

    // Route: Favicon
    if (pathname === "/_favicon") {
      try {
        const favicon = await readFile("./src/favicon.svg", "utf-8");
        res.writeHead(200, {
          "Content-Type": "image/svg+xml",
          "Cache-Control": "public, max-age=31536000, immutable",
        });
        res.end(favicon);
        return;
      } catch {
        sendResponse(res, 404, { "Content-Type": "text/plain" }, "Favicon not found");
        return;
      }
    }

    // Route: Font files
    if (pathname.startsWith("/_fonts/")) {
      const fontPath = pathname.slice(8); // Remove "/_fonts/"
      try {
        const fontFile = await readFile(`./src/fonts/${fontPath}`);
        res.writeHead(200, {
          "Content-Type": "font/woff2",
          "Cache-Control": "public, max-age=31536000, immutable",
        });
        res.end(fontFile);
        return;
      } catch {
        sendResponse(res, 404, { "Content-Type": "text/plain" }, "Font not found");
        return;
      }
    }

    // Route: Analytics page
    if (pathname === "/analytics") {
      if (!eventService) {
        sendResponse(res, 501, { "Content-Type": "text/plain" }, "Events disabled");
        return;
      }

      try {
        const showAllHistory = url.searchParams.get("all") === "true";
        const directory = showAllHistory
          ? undefined
          : url.searchParams.get("directory") || config.directory;

        const analytics = await eventService.getAnalytics(directory);
        const timeSeries = await eventService.getActivityTimeSeries(directory || null, 7);

        // Merge timeSeries into analytics
        analytics.timeSeries = timeSeries;

        const { generateAnalyticsPage } = await import("./analytics-template");
        const html = generateAnalyticsPage({
          data: analytics,
          config,
          files,
          clientScript,
          showAllHistory,
        });
        sendResponse(res, 200, htmlHeaders(), html);
        return;
      } catch (err) {
        console.error("[analytics] Failed to generate analytics page:", err);
        const errorHtml = generateErrorPage({
          errorCode: 500,
          message: "Failed to load analytics",
          files,
          config,
          clientScript,
        });
        sendResponse(res, 500, htmlHeaders(), errorHtml);
        return;
      }
    }

    // Route: Home page (directory index)
    if (pathname === "/") {
      const html = generateIndexPage(files, config, clientScript);
      sendResponse(res, 200, htmlHeaders(), html);
      return;
    }

    // Route: View markdown file
    const viewPath = parseViewPath(pathname);
    if (viewPath) {
      await handleMarkdownView(viewPath, config, files, clientScript, res);
      return;
    }

    // 404 for unknown routes
    const notFoundHtml = generateErrorPage({
      errorCode: 404,
      message: "Page not found",
      files,
      config,
      clientScript,
    });
    sendResponse(res, 404, htmlHeaders(), notFoundHtml);
  };
};

// WebSocket message handler
const handleWebSocketMessage = (
  ws: WebSocket & { file?: string },
  message: Buffer,
  config: Config
) => {
  try {
    const data = JSON.parse(message.toString());

    if (data.type === "watch" && data.file) {
      // Start watching this file
      ws.file = data.file;
      watchFile(config.directory, data.file, ws as any);
    }
  } catch (err) {
    console.error("[ws] Failed to parse message:", err);
  }
};

// Public function: start server
export const startServer = async (config: Config, files: MarkdownFile[]) => {
  // Initialize event service
  const eventService = initEventService(config);

  // Record "open" event for root directory
  if (eventService) {
    eventService.recordEvent("open", config.directory, "dir");
  }

  // Bundle client scripts once at startup
  const clientScript = await getClientScriptTag();

  const server = createServer(createHandler(config, files, clientScript, eventService));

  // Setup WebSocket server if watch is enabled
  let wss: WebSocketServer | undefined;
  if (config.watch) {
    wss = new WebSocketServer({ noServer: true });

    // Handle WebSocket upgrade
    server.on("upgrade", (request, socket, head) => {
      const url = new URL(request.url ?? "/", `http://${request.headers.host}`);
      if (url.pathname === "/_ws") {
        wss?.handleUpgrade(request, socket, head, (ws) => {
          wss?.emit("connection", ws, request);
        });
      } else {
        socket.destroy();
      }
    });

    wss.on("connection", (ws: WebSocket & { file?: string }) => {
      console.log("[ws] Client connected");

      ws.on("message", (message: Buffer) => {
        handleWebSocketMessage(ws, message, config);
      });

      ws.on("close", () => {
        console.log("[ws] Client disconnected");
        // Stop watching all files for this client
        if (ws.file) {
          unwatchFile(ws.file, ws as any);
        }
      });
    });
  }

  // Start listening
  await new Promise<void>((resolve) => {
    server.listen(config.port, "localhost", () => {
      resolve();
    });
  });

  // Get actual assigned port (important when using port 0)
  const address = server.address();
  const actualPort = typeof address === "object" && address !== null ? address.port : config.port;

  // Return server-like object with consistent API
  return {
    hostname: "localhost",
    port: actualPort,
    stop: () => {
      eventService?.close();
      wss?.close();
      server.close();
    },
  };
};

// Pure function: get URL for server
export const getServerUrl = (server: Awaited<ReturnType<typeof startServer>>): string =>
  `http://${server.hostname}:${server.port}`;
