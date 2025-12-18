# llmd

**Serve Markdown as HTML, instantly.**

A minimal CLI tool for viewing Markdown files in your browser with syntax highlighting, live reload, and optional event analytics. Built for developers reviewing LLM-generated documentation.

## Quick Start

Want to see what llmd can do? **Try it on its own documentation:**

```bash
# Install llmd
npm install -g llmd

# View the documentation
llmd docs
```

That's it! The docs will open in your browser. Click through the sidebar to explore.

## Features

- **Simple setup** - Point at a directory and go
- **Syntax highlighting** - Powered by Shiki
- **Live reload** - Watch mode reloads on file changes
- **Copy buttons** - One-click code copying
- **Table of contents** - Auto-generated from headings
- **Highlights** - Extract and save important passages from your docs
- **Usage Analytics** - Track which docs you view most (local-only, opt-in)

## Documentation

- [Installation](./docs/installation.md) - Installation methods
- [Usage](./docs/usage.md) - Command-line options and examples
- [Themes](./docs/themes.md) - Built-in and custom color themes
- [Fonts](./docs/fonts.md) - Built-in and custom font combinations
- [Highlights](./docs/highlights.md) - Extract and save important passages
- [Analytics](./docs/analytics.md) - Local usage tracking

## Basic Usage

```bash
# View llmd documentation
llmd docs

# Serve current directory
llmd

# Serve specific directory
llmd ./docs

# Dark mode with live reload
llmd ./docs --theme dark --watch

# Open directly to analytics
llmd analytics

# Manage analytics database
llmd db check                 # View database stats
llmd db cleanup --days 30     # Delete old events
llmd db clear                 # Clear all analytics data
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
