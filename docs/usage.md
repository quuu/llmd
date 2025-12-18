# Usage

## Basic Commands

```bash
# Serve current directory
llmd

# Serve specific directory
llmd ./docs

# Open directly to analytics
llmd analytics
llmd analytics ~/my-project

# Dark mode with live reload
llmd ./docs --theme dark --watch

# Custom port
llmd ./docs --port 8080
```

## Command-Line Options

| Flag                   | Description                                                                                                | Default      |
| ---------------------- | ---------------------------------------------------------------------------------------------------------- | ------------ |
| `--port <number>`      | Port (0 = random)                                                                                          | `0` (random) |
| `--theme <name>`       | Color theme: `dark`, `light`, `nord`, `dracula`, `solarized`, `monokai`, or custom                         | `dark`       |
| `--fonts <name>`       | Font combination: `serif`, `sans`, `mono`, `classic`, `future`, `modern`, `artsy`, `literary`, `editorial` | `sans`       |
| `--open / --no-open`   | Auto-open browser                                                                                          | `--open`     |
| `--watch / --no-watch` | Live reload on changes                                                                                     | `--no-watch` |
| `-h, --help`           | Show help                                                                                                  |              |
| `--version`            | Show version                                                                                               |              |
