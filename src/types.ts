// Shared TypeScript types for llmd

export type Config = {
  // Directory to serve markdown files from
  directory: string;
  // Optional specific file to open initially
  initialFile?: string;
  // Server options
  port: number;
  // UI options
  theme: string; // Theme name (built-in or custom) - includes colors + fonts
  // Behavior flags
  open: boolean;
  watch: boolean;
  openToAnalytics?: boolean;
};

export type MarkdownFile = {
  // Relative path from root directory (e.g., "README.md" or "docs/api.md")
  path: string;
  // Just the filename
  name: string;
  // Directory depth (0 = root)
  depth: number;
};

export type ParsedArgs = {
  path?: string;
  flags: {
    port?: number;
    theme?: string;
    open?: boolean;
    watch?: boolean;
    help?: boolean;
    version?: boolean;
    analytics?: boolean;
    analyticsSubcommand?: "view" | "enable" | "disable";
    highlights?: boolean;
    highlightsSubcommand?: "enable" | "disable";
    db?: boolean;
    dbSubcommand?: "check" | "cleanup" | "clear";
    archive?: boolean;
    archiveSubcommand?: "list" | "show" | "clear";
    archivePath?: string; // For 'archive show <path>'
    export?: boolean;
    exportPath?: string; // For 'export [path]'
    days?: number;
    docs?: boolean;
  };
};

export type CliResult =
  | { type: "config"; config: Config }
  | { type: "analytics-enable" }
  | { type: "analytics-disable" }
  | { type: "highlights-enable" }
  | { type: "highlights-disable" }
  | { type: "db-check" }
  | { type: "db-cleanup"; days: number }
  | { type: "db-clear" }
  | { type: "archive-list" }
  | { type: "archive-show"; path: string }
  | { type: "archive-clear" }
  | { type: "export"; path: string }
  | { type: "docs" }
  | { type: "exit" };

export type ScanOptions = {
  // Root directory to scan
  root: string;
  // Maximum depth to traverse
  maxDepth: number;
  // Directories to ignore
  ignore: string[];
};

// Event tracking types
export type ResourceType = "file" | "dir";
export type EventType = "view" | "open";

export type Resource = {
  id: string; // UUID
  path: string; // Absolute path
  type: ResourceType;
  created_at: number; // Unix timestamp (ms)
};

export type Event = {
  id: string; // UUID
  type: EventType;
  resource_id: string;
  timestamp: number; // Unix timestamp (ms)
};

export type AnalyticsData = {
  currentDirectory: string;
  mostViewed: Array<{ path: string; name: string; views: number }>;
  timeSeries: Array<{ date: string; count: number }>;
  zeroViews: Array<{ path: string; name: string }>;
  totalEvents: number;
  totalResources: number;
};

export type DatabaseStats = {
  fileSizeBytes: number;
  fileSizeMB: string;
  totalResources: number;
  totalEvents: number;
  oldestEventTimestamp: number | null;
  newestEventTimestamp: number | null;
  databasePath: string;
};

export type EventService = {
  recordEvent: (type: EventType, absolutePath: string, resourceType: ResourceType) => void;
  getAnalytics: (directory?: string) => Promise<AnalyticsData>;
  getActivityTimeSeries: (
    directory: string | null,
    days: number
  ) => Promise<Array<{ date: string; count: number }>>;
  getDatabaseStats: () => Promise<DatabaseStats>;
  cleanupOldEvents: (days: number) => Promise<{ deletedEvents: number; deletedResources: number }>;
  clearDatabase: () => Promise<void>;
  // biome-ignore lint/suspicious/noExplicitAny: Runtime compatibility layer for database access
  getDatabase: () => any;
  close: () => void;
};
