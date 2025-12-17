// File watching functionality (functional style)

import { type FSWatcher, watch } from "node:fs";
import { join } from "node:path";
import type { WebSocket } from "ws";

// Type for tracking watched files and their subscribers
export type WatchedFile = {
  path: string;
  watcher: FSWatcher;
  subscribers: Set<WebSocket & { file?: string }>;
};

// Map of file paths to their watchers and subscribers
const watchedFiles = new Map<string, WatchedFile>();

// Debounce map to avoid rapid reload triggers
const debounceTimers = new Map<string, Timer>();
const DEBOUNCE_DELAY = 300; // ms

// Pure function: create debounced callback
const createDebouncedCallback = (filePath: string, callback: () => void): (() => void) => {
  return () => {
    // Clear existing timer
    const existingTimer = debounceTimers.get(filePath);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    // Set new timer
    const timer = setTimeout(() => {
      callback();
      debounceTimers.delete(filePath);
    }, DEBOUNCE_DELAY);

    debounceTimers.set(filePath, timer);
  };
};

// Side effect: start watching a file
export const watchFile = (
  rootDir: string,
  relativePath: string,
  subscriber: WebSocket & { file?: string }
): void => {
  const fullPath = join(rootDir, relativePath);

  // Check if already watching
  const existing = watchedFiles.get(relativePath);
  if (existing) {
    // Add this subscriber
    existing.subscribers.add(subscriber);
    console.log(
      `[watcher] Added subscriber to ${relativePath} (${existing.subscribers.size} total)`
    );
    return;
  }

  // Create new watcher
  console.log(`[watcher] Starting watch for ${relativePath}`);

  const watcher = watch(fullPath, (eventType) => {
    if (eventType === "change") {
      const watched = watchedFiles.get(relativePath);
      if (!watched) {
        return;
      }

      // Debounced reload broadcast
      const debouncedBroadcast = createDebouncedCallback(relativePath, () => {
        console.log(
          `[watcher] File changed: ${relativePath}, notifying ${watched.subscribers.size} subscriber(s)`
        );

        // Broadcast reload to all subscribers
        watched.subscribers.forEach((ws) => {
          try {
            ws.send(
              JSON.stringify({
                type: "reload",
                file: relativePath,
              })
            );
          } catch (err) {
            console.error("[watcher] Failed to send reload message:", err);
          }
        });
      });

      debouncedBroadcast();
    }
  });

  watcher.on("error", (error) => {
    console.error(`[watcher] Error watching ${relativePath}:`, error);
  });

  // Store watcher and subscriber
  watchedFiles.set(relativePath, {
    path: relativePath,
    watcher,
    subscribers: new Set([subscriber]),
  });
};

// Side effect: stop watching a file for a specific subscriber
export const unwatchFile = (
  relativePath: string,
  subscriber: WebSocket & { file?: string }
): void => {
  const watched = watchedFiles.get(relativePath);
  if (!watched) {
    return;
  }

  // Remove subscriber
  watched.subscribers.delete(subscriber);
  console.log(
    `[watcher] Removed subscriber from ${relativePath} (${watched.subscribers.size} remaining)`
  );

  // If no more subscribers, stop watching
  if (watched.subscribers.size === 0) {
    console.log(`[watcher] Stopping watch for ${relativePath}`);
    watched.watcher.close();
    watchedFiles.delete(relativePath);

    // Clear debounce timer if exists
    const timer = debounceTimers.get(relativePath);
    if (timer) {
      clearTimeout(timer);
      debounceTimers.delete(relativePath);
    }
  }
};

// Side effect: cleanup all watchers (on server shutdown)
export const cleanupAllWatchers = (): void => {
  console.log(`[watcher] Cleaning up ${watchedFiles.size} watcher(s)`);

  watchedFiles.forEach((watched) => {
    watched.watcher.close();
  });

  watchedFiles.clear();

  debounceTimers.forEach((timer) => {
    clearTimeout(timer);
  });

  debounceTimers.clear();
};
