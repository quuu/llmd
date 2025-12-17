// Client asset bundling and serving

import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

// Build client bundle on startup and cache it
let clientScriptCache: string | null = null;

export const getClientScript = async (): Promise<string> => {
  if (clientScriptCache) {
    return clientScriptCache;
  }

  try {
    // Read pre-built client bundle from dist/
    const __dirname = dirname(fileURLToPath(import.meta.url));
    const clientPath = join(__dirname, "../dist/client.js");
    clientScriptCache = await readFile(clientPath, "utf-8");
    return clientScriptCache;
  } catch (error) {
    console.error("Failed to load client bundle:", error);
    return "";
  }
};

// Generate inline script tag
export const getClientScriptTag = async (): Promise<string> => {
  const script = await getClientScript();
  return `<script>${script}</script>`;
};
