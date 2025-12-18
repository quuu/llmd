// Bundle client-side scripts
// This file bundles all client-side code and can be served as /client.js

import "./client/collapsible";
import "./client/copy-button";
import "./client/file-watcher";
import { initHighlights } from "./client/highlights";
import { initHighlightsSummary } from "./client/highlights-summary";
import "./client/sidebar-resize";
import { trackDirectoryOpen, trackFileView } from "./client/events";

// Expose event tracking functions on window
// biome-ignore lint/suspicious/noExplicitAny: Need to extend window global
(window as any).trackDirectoryOpen = trackDirectoryOpen;
// biome-ignore lint/suspicious/noExplicitAny: Need to extend window global
(window as any).trackFileView = trackFileView;

// Initialize highlights on markdown pages
if (document.querySelector(".content")) {
  initHighlights();
  initHighlightsSummary();
}

console.log("[llmd] Client initialized");
