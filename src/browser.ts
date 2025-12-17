// Browser automation (functional style)

import { spawn } from "node:child_process";

// Side effect: open URL in default browser
export const openBrowser = (url: string): void => {
  const platform = process.platform;

  try {
    let command: string;
    let args: string[];

    if (platform === "darwin") {
      command = "open";
      args = [url];
    } else if (platform === "win32") {
      command = "cmd";
      args = ["/c", "start", url];
    } else {
      // Linux and others
      command = "xdg-open";
      args = [url];
    }

    const child = spawn(command, args, { detached: true, stdio: "ignore" });
    child.unref(); // Allow parent process to exit independently
  } catch (error) {
    console.error("Failed to open browser:", error);
  }
};
