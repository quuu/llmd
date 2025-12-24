// Client asset bundling and serving

import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

// Cache directory path and client script
const __dirname = dirname(fileURLToPath(import.meta.url));
let clientScriptCache: string | null = null;

export const getClientScript = async (): Promise<string> => {
  if (clientScriptCache) {
    return clientScriptCache;
  }

  try {
    // Read pre-built client bundle from dist/
    const clientPath = join(__dirname, "client.js");
    clientScriptCache = await readFile(clientPath, "utf-8");
    return clientScriptCache;
  } catch (error) {
    console.error("Failed to load client bundle:", error);
    return "";
  }
};

// Check if bundle has inline source maps (for dev mode detection)
export const hasSourceMaps = async (): Promise<boolean> => {
  const script = await getClientScript();
  return script.includes("//# sourceMappingURL=data:application/json;base64,");
};

// Generate inline script tag (for production)
export const getClientScriptTag = async (): Promise<string> => {
  const script = await getClientScript();
  return `<script>${script}</script>`;
};

// Generate external script tag (for development with source maps)
export const getClientScriptTagExternal = (): string => '<script src="/_client.js"></script>';
