# llmd

**Serve Markdown as beautiful HTML. Instantly.**

A zero-config CLI tool for viewing Markdown files in your browser with syntax highlighting, live reload, and a clean interface. Built for developers reviewing LLM-generated documentation.

```
 ██╗     ██╗     ███╗   ███╗██████╗ 
 ██║     ██║     ████╗ ████║██╔══██╗
 ██║     ██║     ██╔████╔██║██║  ██║
 ██║     ██║     ██║╚██╔╝██║██║  ██║
 ███████╗███████╗██║ ╚═╝ ██║██████╔╝
 ╚══════╝╚══════╝╚═╝     ╚═╝╚═════╝ 
```

## Features

- **Zero config** - Point at a directory and go
- **Syntax highlighting** - Powered by Shiki
- **Live reload** - Watch mode reloads on file changes
- **Copy buttons** - One-click code copying
- **Dark/light themes** - With 3 font options
- **Fast** - Built with Bun, instant startup
- **Sidebar navigation** - Browse files with directory structure
- **Table of contents** - Auto-generated from headings

## Installation

### npm (Recommended)

```bash
npm install -g llmd
```

Or run directly without installing:
```bash
npx llmd
```

Requires Node.js 22 or later.

### From Source

```bash
git clone https://github.com/pbzona/llmd.git
cd llmd
bun install
bun run build:npm
npm install -g .
```

## Usage

```bash
# Serve current directory
llmd

# Serve specific directory
llmd ./docs

# Dark mode with live reload
llmd ./docs --theme dark --watch

# Custom port
llmd ./docs --port 8080
```

## Font Combinations

llmd includes 9 built-in font combinations:

- **serif** - System serif fonts (Georgia, Times)
- **sans** - System sans-serif fonts (default)
- **mono** - System monospace fonts
- **classic** - Baskerville headings + Geist body
- **future** - Space Mono headings + Space Grotesk body
- **modern** - Inter throughout + JetBrains Mono
- **artsy** - Playfair Display + Fira Code
- **literary** - Spectral headings + Newsreader body
- **editorial** - Bitter headings + Lora body

All custom fonts are loaded from Google Fonts CDN for fast, reliable delivery.

### Custom Fonts

Create custom font combinations in your `themes.json` config file.

**Location:** `~/.config/llmd/themes.json` (or `$XDG_CONFIG_HOME/llmd/themes.json`)

**Simple Example (Auto-loaded from Google Fonts):**
```json
{
  "fontThemes": {
    "myfont": {
      "heading": "Montserrat, sans-serif",
      "body": "Open Sans, sans-serif",
      "code": "Source Code Pro, monospace"
    }
  }
}
```

Google Fonts are **loaded automatically** with weights 400 and 700. Just specify the font family names - no need to construct Google Fonts URLs manually!

**Advanced Example (Custom Weights/Styles):**
```json
{
  "fontThemes": {
    "custom": {
      "heading": "Poppins, sans-serif",
      "body": "Inter, sans-serif", 
      "code": "Fira Code, monospace",
      "googleFontsUrl": "https://fonts.googleapis.com/css2?family=Poppins:wght@400;600;700&family=Inter:wght@300;400;500&family=Fira+Code:wght@400;500&display=swap"
    }
  }
}
```

Use `googleFontsUrl` only if you need specific weights (like 300, 500, 600) or styles (italic, etc.). Get custom URLs from [Google Fonts](https://fonts.google.com).

**Usage:**
```bash
llmd --fonts myfont
```

**Requirements:**
- `heading`, `body`, and `code` properties are required
- Font names should include CSS fallbacks (e.g., `"Roboto, sans-serif"`)
- System fonts (Arial, Georgia, etc.) don't load from Google Fonts
- Invalid font names will show helpful errors listing all available fonts

## Color Themes

llmd includes 6 built-in color themes:

- **dark** - Default dark theme (default)
- **light** - Warm light theme
- **nord** - Nord-inspired cool theme
- **dracula** - Dracula-inspired purple theme
- **solarized** - Solarized Light theme
- **monokai** - Monokai-inspired theme

### Custom Themes

Create custom color themes in your `themes.json` config file.

**Location:** `~/.config/llmd/themes.json` (or `$XDG_CONFIG_HOME/llmd/themes.json`)

**Format:**
```json
{
  "colorThemes": {
    "mytheme": {
      "bg": "#1a1a1a",
      "fg": "#e0e0e0",
      "border": "#333",
      "hover": "#2a2a2a",
      "accent": "#4a9eff",
      "codeBg": "#2d2d2d",
      "sidebarBg": "#151515",
      "folderIcon": "#a78bfa",
      "fileIcon": "#fbbf24"
    }
  }
}
```

**Unified Config:**
You can combine both color themes and font themes in a single file:
```json
{
  "colorThemes": {
    "mytheme": { ... }
  },
  "fontThemes": {
    "myfont": { ... }
  }
}
```

**Usage:**
```bash
llmd --theme mytheme --fonts myfont
```

If a theme or font is not found, llmd will list all available options.

**Note:** The old flat format for color themes (without `colorThemes` key) is still supported for backward compatibility.

## Options

| Flag | Description | Default |
|------|-------------|---------|
| `--port <number>` | Port (0 = random) | `0` (random) |
| `--host <string>` | Host interface | `localhost` |
| `--theme <name>` | Color theme: `dark`, `light`, `nord`, `dracula`, `solarized`, `monokai`, or custom | `dark` |
| `--fonts <name>` | Font combination: `serif`, `sans`, `mono`, `classic`, `future`, `modern`, `artsy`, `literary`, `editorial` | `sans` |
| `--open / --no-open` | Auto-open browser | `--open` |
| `--watch / --no-watch` | Live reload on changes | `--no-watch` |
| `-h, --help` | Show help | |
| `--version` | Show version | |

## Development

```bash
# Install dependencies
bun install

# Run with hot reload
bun --hot index.ts ./docs

# Run tests
bun test

# Build binary
bun run build
```

## Tech Stack

- **Runtime**: Bun
- **Markdown**: marked (GFM support)
- **Highlighting**: Shiki (VS Code themes)
- **Server**: Bun.serve() with WebSocket
- **Bundler**: Bun's built-in bundler

## License

MIT

## Contributing

Issues and PRs welcome. This tool is intentionally minimal—new features should materially improve the "view markdown now" workflow.
