// HTML template generation

import { generateFontImport, getFontFamilies } from "./font-themes";
import { getThemeColors } from "./theme-config";
import type { Config, MarkdownFile } from "./types";

// Pure function: generate embedded CSS
const getStyles = (themeName: string, fontTheme: string): string => {
  const colors = getThemeColors(themeName);
  const fontFamilies = getFontFamilies(fontTheme);
  // Determine if theme is dark based on background brightness
  const isDark = Number.parseInt(colors.bg.replace("#", ""), 16) < 0x80_80_80;

  return `
    
    * { margin: 0; padding: 0; box-sizing: border-box; }
    
    :root {
      --bg: ${colors.bg};
      --fg: ${colors.fg};
      --border: ${colors.border};
      --hover: ${colors.hover};
      --accent: ${colors.accent};
      --code-bg: ${colors.codeBg};
      --sidebar-bg: ${colors.sidebarBg};
    }
    
    body {
      font-family: ${fontFamilies.body};
      font-size: 16px;
      line-height: 1.7;
      color: var(--fg);
      background: var(--bg);
      display: flex;
      min-height: 100vh;
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
    }
    
    .sidebar {
      width: 280px;
      background: var(--sidebar-bg);
      border-right: 1px solid var(--border);
      overflow-y: auto;
      flex-shrink: 0;
    }
    
    .sidebar-header {
      padding: 20px;
      border-bottom: 1px solid var(--border);
    }
    
    .sidebar-header h1 {
      font-size: 1.25rem;
      font-weight: 700;
      letter-spacing: -0.01em;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    
    .sidebar-header h1 svg {
      width: 20px;
      height: 20px;
      flex-shrink: 0;
    }
    
    .sidebar-nav {
      padding: 12px;
    }
    
    .sidebar-nav ul {
      list-style: none;
    }
    
    .sidebar-nav li {
      margin: 2px 0;
    }
    
    .sidebar-nav .dir-item {
      margin: 6px 0;
      position: relative;
    }
    
    .sidebar-nav .dir-item > ul {
      margin-top: 2px;
      position: relative;
      padding-left: 12px;
      border-left: 1px solid ${isDark ? "#333" : "#ddd"};
      margin-left: 6px;
    }
    
    .sidebar-nav .dir-label {
      padding: 7px 8px 7px 6px;
      font-size: 0.9375rem;
      font-weight: 600;
      color: ${isDark ? "#b3b3b3" : "#666"};
      text-transform: none;
      position: relative;
      display: flex;
      align-items: center;
      gap: 8px;
      letter-spacing: 0.01em;
    }
    
    .sidebar-nav .dir-label svg {
      width: 18px;
      height: 18px;
      flex-shrink: 0;
      opacity: 0.9;
      color: ${colors.folderIcon};
      stroke: currentColor;
    }
    
    .sidebar-nav a {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 7px 8px 7px 6px;
      color: var(--fg);
      text-decoration: none;
      border-radius: 6px;
      font-size: 0.9375rem;
      transition: background 0.15s;
      position: relative;
      line-height: 1.4;
    }
    
    .sidebar-nav a svg {
      width: 18px;
      height: 18px;
      flex-shrink: 0;
      opacity: 0.8;
      color: ${colors.fileIcon};
      stroke: currentColor;
    }
    
    .sidebar-nav a::before {
      content: "";
      position: absolute;
      left: -13px;
      top: 50%;
      width: 8px;
      height: 1px;
      background: ${isDark ? "#333" : "#ddd"};
    }
    
    .sidebar-nav a:hover {
      background: var(--hover);
    }
    
    .sidebar-nav a.active {
      background: var(--accent);
      color: ${isDark ? "#000000" : "#ffffff"};
      font-weight: 600;
    }
    
    .sidebar-nav a.active svg {
      opacity: 1;
    }
    
    .sidebar-nav .depth-0 { padding-left: 6px; }
    .sidebar-nav .depth-1 { padding-left: 18px; }
    .sidebar-nav .depth-2 { padding-left: 30px; }
    .sidebar-nav .depth-3 { padding-left: 42px; }
    
    .sidebar-nav > ul > li > a::before {
      display: none;
    }
    
    .main {
      flex: 1;
      overflow-y: auto;
      padding: 40px;
    }
    
    .container {
      max-width: 800px;
      margin: 0 auto;
    }
    
    .content h1, .content h2, .content h3, .content h4, .content h5, .content h6 {
      font-family: ${fontFamilies.heading};
      font-weight: 700;
      line-height: 1.3;
      letter-spacing: -0.02em;
    }
    
    .content h1 { 
      font-size: 2.5rem;
      margin: 2.5rem 0 1rem;
      font-weight: 800;
    }
    .content h2 { 
      font-size: 2rem;
      margin: 2rem 0 0.875rem;
    }
    .content h3 { 
      font-size: 1.5rem;
      margin: 1.75rem 0 0.75rem;
    }
    .content h4 { 
      font-size: 1.25rem;
      margin: 1.5rem 0 0.625rem;
    }
    .content h5 { 
      font-size: 1.125rem;
      margin: 1.25rem 0 0.5rem;
    }
    .content h6 { 
      font-size: 1rem;
      margin: 1rem 0 0.5rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    
    .content p { 
      margin: 1.25rem 0;
      max-width: 65ch;
    }
    .content ul, .content ol { 
      margin: 1.25rem 0;
      padding-left: 1.75rem;
      max-width: 65ch;
    }
    .content li { 
      margin: 0.35rem 0;
      line-height: 1.6;
    }
    
    .content a {
      color: var(--accent);
      text-decoration: none;
    }
    
    .content a:hover {
      text-decoration: underline;
    }
    
    .content pre {
      background: var(--code-bg);
      padding: 1.25rem;
      border-radius: 0.5rem;
      overflow-x: auto;
      margin: 1.5rem 0;
      border: 1px solid var(--border);
      position: relative;
      line-height: 1.6;
      font-size: 0.9375rem;
    }
    
    .copy-button {
      position: absolute;
      top: 8px;
      right: 8px;
      padding: 4px 12px;
      font-size: 12px;
      background: var(--accent);
      color: ${isDark ? "#000000" : "#ffffff"};
      border: none;
      border-radius: 4px;
      cursor: pointer;
      opacity: 0;
      transition: opacity 0.2s;
      font-weight: 600;
    }
    
    .content pre:hover .copy-button {
      opacity: 1;
    }
    
    .copy-button:hover {
      opacity: 1 !important;
      filter: brightness(1.1);
    }
    
    .copy-button.copied {
      background: #22c55e;
    }
    
    .content code {
      font-family: ${fontFamilies.code};
      font-size: 0.875em;
      font-variant-ligatures: none;
    }
    
    .content p code {
      background: var(--code-bg);
      padding: 0.125rem 0.375rem;
      border-radius: 0.25rem;
      font-size: 0.875em;
      border: 1px solid var(--border);
    }
    
    .content blockquote {
      border-left: 4px solid var(--accent);
      padding-left: 1.25rem;
      margin: 1.5rem 0;
      color: ${isDark ? "#c0c0c0" : "#666"};
      font-style: italic;
      max-width: 65ch;
    }
    
    .content blockquote p {
      margin: 0.75rem 0;
    }
    
    .content table {
      border-collapse: collapse;
      width: 100%;
      margin: 16px 0;
    }
    
    .content th, .content td {
      border: 1px solid var(--border);
      padding: 10px 14px;
      text-align: left;
    }
    
    .content th {
      background: var(--sidebar-bg);
      font-weight: 600;
    }
    
    .content img {
      max-width: 100%;
      height: auto;
      border-radius: 8px;
      margin: 16px 0;
    }
    
    .toc {
      background: var(--sidebar-bg);
      border: 1px solid var(--border);
      border-radius: 8px;
      padding: 20px;
      margin: 24px 0;
    }
    
    .toc h3 {
      font-size: 0.875rem;
      margin-bottom: 12px;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      font-weight: 700;
      color: ${isDark ? "#b3b3b3" : "#666"};
    }
    
    .toc ul {
      list-style: none;
      padding-left: 0;
    }
    
    .toc li {
      margin: 6px 0;
    }
    
    .toc a {
      color: var(--fg);
      text-decoration: none;
    }
    
    .toc a:hover {
      color: var(--accent);
    }
    
    .toc .toc-level-1 { padding-left: 0; }
    .toc .toc-level-2 { padding-left: 16px; }
    .toc .toc-level-3 { padding-left: 32px; }
    .toc .toc-level-4 { padding-left: 48px; }
    
    .error {
      padding: 60px 20px;
      text-align: center;
    }
    
    .error h1 {
      font-size: 48px;
      margin-bottom: 16px;
    }
    
    .error p {
      font-size: 18px;
      color: ${isDark ? "#c0c0c0" : "#666"};
    }
    
    @media (max-width: 768px) {
      body { flex-direction: column; }
      .sidebar { width: 100%; border-right: none; border-bottom: 1px solid var(--border); }
      .main { padding: 20px; }
    }
  `;
};

// Type for tree nodes
type TreeNode = {
  type: "file" | "directory";
  name: string;
  path: string; // File path or directory path
  depth: number;
  children: TreeNode[];
};

// Pure function: build tree structure from flat file list
const buildTree = (files: MarkdownFile[]): TreeNode[] => {
  const root: TreeNode[] = [];
  const dirMap = new Map<string, TreeNode>();

  for (const file of files) {
    const parts = file.path.split("/");
    let currentLevel = root;
    let currentPath = "";

    // Process each directory in the path
    for (let i = 0; i < parts.length - 1; i++) {
      const dirName = parts[i];
      if (!dirName) {
        continue;
      }

      currentPath = currentPath.length > 0 ? `${currentPath}/${dirName}` : dirName;

      // Check if directory node already exists
      const existingDir = dirMap.get(currentPath);
      if (existingDir) {
        currentLevel = existingDir.children;
      } else {
        const dirNode: TreeNode = {
          type: "directory",
          name: dirName,
          path: currentPath,
          depth: i,
          children: [],
        };
        dirMap.set(currentPath, dirNode);
        currentLevel.push(dirNode);
        currentLevel = dirNode.children;
      }
    }

    // Add the file
    currentLevel.push({
      type: "file",
      name: file.name,
      path: file.path,
      depth: file.depth,
      children: [],
    });
  }

  return root;
};

// Pure function: check if a node has any descendant files
const hasFiles = (node: TreeNode): boolean => {
  if (node.type === "file") {
    return true;
  }
  return node.children.some((child) => hasFiles(child));
};

// SVG icons (from Lucide, MIT licensed)
const FOLDER_ICON = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z"/></svg>`;

const FILE_ICON = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 22a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h8a2.4 2.4 0 0 1 1.704.706l3.588 3.588A2.4 2.4 0 0 1 20 8v12a2 2 0 0 1-2 2z"/><path d="M14 2v5a1 1 0 0 0 1 1h5"/></svg>`;

// Pure function: render tree nodes recursively
const renderTreeNodes = (nodes: TreeNode[], currentPath?: string): string =>
  nodes
    .filter((node) => hasFiles(node)) // Only render nodes that have files
    .map((node) => {
      if (node.type === "directory") {
        const children =
          node.children.length > 0 ? renderTreeNodes(node.children, currentPath) : "";
        // Only render directory if it has children after filtering
        if (!children) {
          return "";
        }
        return `<li class="dir-item">
          <div class="dir-label depth-${node.depth}">${FOLDER_ICON}<span>${node.name}/</span></div>
          <ul>${children}</ul>
        </li>`;
      }
      const isActive = currentPath === node.path;
      const activeClass = isActive ? "active" : "";
      return `<li><a href="/view/${node.path}" class="depth-${node.depth} ${activeClass}">${FILE_ICON}<span>${node.name}</span></a></li>`;
    })
    .join("\n");

// Pure function: generate file tree sidebar HTML
const generateSidebar = (files: MarkdownFile[], currentPath?: string): string => {
  if (files.length === 0) {
    return '<div class="sidebar-nav"><p style="padding: 12px; color: #b3b3b3;">No markdown files found</p></div>';
  }

  const tree = buildTree(files);
  const items = renderTreeNodes(tree, currentPath);

  return `<nav class="sidebar-nav"><ul>${items}</ul></nav>`;
};

// Options for base layout
type LayoutOptions = {
  content: string;
  title: string;
  theme: string; // Theme name (built-in or custom)
  fontTheme: string;
  files: MarkdownFile[];
  currentPath?: string;
  clientScript?: string;
  watchEnabled?: boolean;
  watchFile?: string;
};

// Pure function: base HTML layout
const baseLayout = (options: LayoutOptions): string => {
  const {
    content,
    title,
    theme,
    fontTheme,
    files,
    currentPath,
    clientScript,
    watchEnabled,
    watchFile,
  } = options;

  const watchScriptTag =
    watchEnabled && watchFile
      ? `<script>window.addEventListener('load', () => window.connectFileWatcher?.('${watchFile}'));</script>`
      : "";

  const fontImport = generateFontImport(fontTheme);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title} - llmd</title>
  <link rel="icon" type="image/svg+xml" href="/_favicon">
  ${fontImport}
  <style>${getStyles(theme, fontTheme)}</style>
</head>
<body>
  <aside class="sidebar">
    <div class="sidebar-header">
      <h1>
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">
          <defs>
            <linearGradient id="logoGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" style="stop-color:#60a5fa;stop-opacity:1" />
              <stop offset="100%" style="stop-color:#2563eb;stop-opacity:1" />
            </linearGradient>
          </defs>
          <path d="M16 6 L16 20 M16 20 L10 14 M16 20 L22 14" 
                stroke="url(#logoGrad)" 
                stroke-width="3" 
                stroke-linecap="round" 
                stroke-linejoin="round" 
                fill="none"/>
        </svg>
        llmd
      </h1>
    </div>
    ${generateSidebar(files, currentPath)}
  </aside>
  <main class="main">
    <div class="container">
      ${content}
    </div>
  </main>
  ${clientScript || ""}
  ${watchScriptTag}
</body>
</html>`;
};

// Public function: generate directory index page
export const generateIndexPage = (
  files: MarkdownFile[],
  config: Config,
  clientScript?: string
): string => {
  const asciiArt = `<pre style="font-family: monospace; font-size: 14px; line-height: 1.4; margin: 0 0 32px 0; white-space: pre;"><span style="color: #60a5fa;">dP dP                  dP</span>
<span style="color: #60a5fa;">88 88                  88</span>
<span style="color: #3b82f6;">88 88 88d8b.d8b. .d888b88</span>
<span style="color: #3b82f6;">88 88 88'\`88'\`88 88'  \`88</span>
<span style="color: #2563eb;">88 88 88  88  88 88.  .88</span>
<span style="color: #1d4ed8;">dP dP dP  dP  dP \`88888P8</span></pre>`;

  // Get top 3-4 files from root directory (depth 0)
  const rootFiles = files.filter((f) => f.depth === 0).slice(0, 4);
  const isDark = config.theme === "dark";
  const fileList =
    rootFiles.length > 0
      ? `<div style="margin-top: 24px; text-align: left; display: inline-block;">
         <ul style="list-style: none; padding: 0; margin: 0; font-size: 13px;">
           ${rootFiles
             .map(
               (f) => `<li style="margin: 6px 0;">
             <a href="/view/${f.path}" style="color: ${isDark ? "#a0a0a0" : "#666"}; text-decoration: none; display: flex; align-items: center; gap: 6px; transition: color 0.15s;">
               <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="opacity: 0.6;">
                 <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                 <polyline points="14 2 14 8 20 8"></polyline>
               </svg>
               ${f.name}
             </a>
           </li>`
             )
             .join("")}
         </ul>
       </div>`
      : "";

  const content =
    files.length > 0
      ? `<div style="display: flex; align-items: center; justify-content: center; min-height: 100%; padding: 80px 40px 40px 40px;">
         <div style="text-align: center;">
           ${asciiArt}
           <p style="color: var(--fg); opacity: 0.5; font-size: 13px; margin: 0;">
             ${files.length} file${files.length === 1 ? "" : "s"}
           </p>
           ${fileList}
         </div>
       </div>`
      : `<div style="display: flex; align-items: center; justify-content: center; min-height: 100%; padding: 80px 40px 40px 40px;">
         <div style="text-align: center;">
           ${asciiArt}
           <p style="color: var(--fg); opacity: 0.5; font-size: 13px; margin: 0;">
             No markdown files found
           </p>
         </div>
       </div>`;

  return baseLayout({
    content,
    title: "Home",
    theme: config.theme,
    fontTheme: config.fontTheme,
    files,
    clientScript,
  });
};

// Options for markdown page generation
type MarkdownPageOptions = {
  html: string;
  toc: string;
  fileName: string;
  files: MarkdownFile[];
  config: Config;
  currentPath: string;
  clientScript?: string;
};

// Public function: generate markdown view page
export const generateMarkdownPage = (options: MarkdownPageOptions): string => {
  const { html, toc, fileName, files, config, currentPath, clientScript } = options;
  const content = `<div class="content">
    ${toc}
    ${html}
  </div>`;

  return baseLayout({
    content,
    title: fileName,
    theme: config.theme,
    fontTheme: config.fontTheme,
    files,
    currentPath,
    clientScript,
    watchEnabled: config.watch,
    watchFile: currentPath,
  });
};

// Options for error page generation
type ErrorPageOptions = {
  errorCode: number;
  message: string;
  files: MarkdownFile[];
  config: Config;
  clientScript?: string;
};

// Public function: generate error page
export const generateErrorPage = (options: ErrorPageOptions): string => {
  const { errorCode, message, files, config, clientScript } = options;
  const content = `<div class="error">
    <h1>${errorCode}</h1>
    <p>${message}</p>
  </div>`;

  return baseLayout({
    content,
    title: `Error ${errorCode}`,
    theme: config.theme,
    fontTheme: config.fontTheme,
    files,
    clientScript,
  });
};
