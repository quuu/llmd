import { describe, expect, test } from "bun:test";
import { createConfig, parseArgs } from "./cli";

describe("parseArgs", () => {
  test("parses path argument", () => {
    const result = parseArgs(["./docs"]);
    expect(result.path).toBe("./docs");
  });

  test("parses flags", () => {
    const result = parseArgs(["--port", "3000"]);
    expect(result.flags.port).toBe(3000);
  });

  test("parses boolean flags", () => {
    const result = parseArgs(["--no-open", "--watch"]);
    expect(result.flags.open).toBe(false);
    expect(result.flags.watch).toBe(true);
  });

  test("parses theme flag", () => {
    const result = parseArgs(["--theme", "dark"]);
    expect(result.flags.theme).toBe("dark");
  });

  test("handles help flag", () => {
    const result = parseArgs(["--help"]);
    expect(result.flags.help).toBe(true);
  });

  test("handles version flag", () => {
    const result = parseArgs(["--version"]);
    expect(result.flags.version).toBe(true);
  });

  test("parses analytics subcommands", () => {
    const enableResult = parseArgs(["analytics", "enable"]);
    expect(enableResult.flags.analytics).toBe(true);
    expect(enableResult.flags.analyticsSubcommand).toBe("enable");

    const disableResult = parseArgs(["analytics", "disable"]);
    expect(disableResult.flags.analytics).toBe(true);
    expect(disableResult.flags.analyticsSubcommand).toBe("disable");

    const viewResult = parseArgs(["analytics", "view"]);
    expect(viewResult.flags.analytics).toBe(true);
    expect(viewResult.flags.analyticsSubcommand).toBe("view");
  });

  test("parses db subcommands", () => {
    const checkResult = parseArgs(["db", "check"]);
    expect(checkResult.flags.db).toBe(true);
    expect(checkResult.flags.dbSubcommand).toBe("check");

    const cleanupResult = parseArgs(["db", "cleanup"]);
    expect(cleanupResult.flags.db).toBe(true);
    expect(cleanupResult.flags.dbSubcommand).toBe("cleanup");

    const clearResult = parseArgs(["db", "clear"]);
    expect(clearResult.flags.db).toBe(true);
    expect(clearResult.flags.dbSubcommand).toBe("clear");
  });

  test("parses --days flag for db cleanup", () => {
    const result = parseArgs(["db", "cleanup", "--days", "7"]);
    expect(result.flags.days).toBe(7);
  });

  test("uses default 30 days when --days not provided", () => {
    const result = parseArgs(["db", "cleanup"]);
    expect(result.flags.days).toBeUndefined();
  });

  test("handles invalid --days value", () => {
    const result = parseArgs(["db", "cleanup", "--days", "invalid"]);
    expect(result.flags.days).toBe(30); // Should default to 30
  });
});

describe("createConfig", () => {
  test("uses defaults or saved preferences when no flags provided", () => {
    const parsed = parseArgs([]);
    const config = createConfig(parsed);
    expect(config.port).toBe(0);
    // Theme may be "dark" (default) or saved preference from database
    expect(typeof config.theme).toBe("string");
    expect(config.open).toBe(true);
    expect(config.watch).toBe(false);
  });

  test("resolves directory path", () => {
    const parsed = parseArgs(["./docs"]);
    const config = createConfig(parsed);
    expect(config.directory).toContain("docs");
    expect(config.initialFile).toBeUndefined();
  });

  test("resolves file path and extracts directory", () => {
    const parsed = parseArgs(["./docs/README.md"]);
    const config = createConfig(parsed);
    expect(config.directory).toContain("docs");
    expect(config.initialFile).toContain("README.md");
  });

  test("applies flag overrides", () => {
    const parsed = parseArgs(["--port", "8080", "--theme", "dark", "--no-open"]);
    const config = createConfig(parsed);
    expect(config.port).toBe(8080);
    expect(config.theme).toBe("dark");
    expect(config.open).toBe(false);
  });
});
