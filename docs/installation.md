# Installation

## npm (Recommended)

```bash
npm install -g llmd
```

Or run directly without installing:

```bash
npx llmd
```

Requires Node.js 22 or later.

## Quick Start

After installation, try it out:

```bash
llmd docs
```

This will clone the llmd repository to `~/.local/share/llmd-docs` and open the documentation in your browser.

## From Source

```bash
git clone https://github.com/pbzona/llmd.git
cd llmd
bun install
bun run build:npm
npm install -g .
```
