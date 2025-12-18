# llmd

**Serve Markdown as beautiful HTML. Instantly.**

A minimal CLI tool for viewing Markdown files in your browser with syntax highlighting, live reload, and a clean interface. Built for developers reviewing LLM-generated documentation.

## Installation

```bash
npm install -g llmd
```

Or run directly without installing:

```bash
npx llmd
```

Requires Node.js 22 or later.

## Quick Start

Want to see what llmd can do? **Try it on its own documentation:**

```bash
# Clone this repo
git clone https://github.com/pbzona/llmd.git
cd llmd

# Install dependencies
bun install

# Serve the docs (with live reload and analytics enabled)
LLMD_ENABLE_EVENTS=1 bun --hot index.ts ./docs --watch
```

Now click through the sidebar to explore the documentation. The analytics page will show you which docs you've viewed!

## Features

- **Simple setup** - Point at a directory and go
- **Syntax highlighting** - Powered by Shiki
- **Live reload** - Watch mode reloads on file changes
- **Copy buttons** - One-click code copying
- **Dark/light themes** - With 9 font combinations
- **Fast** - Built with Bun, instant startup
- **Sidebar navigation** - Browse files with directory structure
- **Table of contents** - Auto-generated from headings
- **Usage Analytics** - Track which docs you view most (local-only, opt-in)

## Documentation

- [Installation](./docs/installation.md) - Installation methods
- [Usage](./docs/usage.md) - Command-line options and examples
- [Themes](./docs/themes.md) - Built-in and custom color themes
- [Fonts](./docs/fonts.md) - Built-in and custom font combinations
- [Analytics](./docs/analytics.md) - Local usage tracking

## Basic Usage

```bash
# Serve current directory
llmd

# Serve specific directory
llmd ./docs

# Dark mode with live reload
llmd ./docs --theme dark --watch

# Open directly to analytics
llmd analytics
```

See [Usage](./docs/usage.md) for all options.

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
- **Server**: Node.js http + ws
- **Bundler**: Bun's built-in bundler

## License

MIT

## Contributing

Issues and PRs welcome. This tool is intentionally minimal—new features should materially improve the "view markdown now" workflow.
