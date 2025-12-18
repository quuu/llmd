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
| `--theme <name>`       | Color theme: `dark`, `light`, `nord`, `dracula`, `solarized`, `monokai`, or custom                         | `dark`* |
| `--fonts <name>`       | Font combination: `serif`, `sans`, `mono`, `classic`, `future`, `modern`, `artsy`, `literary`, `editorial` | `sans`* |
| `--open / --no-open`   | Auto-open browser                                                                                          | `--open`     |
| `--watch / --no-watch` | Live reload on changes                                                                                     | `--no-watch` |
| `-h, --help`           | Show help                                                                                                  |              |
| `--version`            | Show version                                                                                               |              |

\* Theme and font preferences are saved automatically. The default is used only on first run.

## Theme Persistence

llmd remembers your last theme and font choices. When you run llmd with `--theme` or `--fonts`, that selection is saved and becomes your new default:

```bash
# First time - uses default (dark + sans)
llmd ./docs

# Set your preferred theme and fonts
llmd ./docs --theme nord --fonts modern

# Next time - automatically uses nord + modern
llmd ./docs

# Override saved preference temporarily
llmd ./docs --theme dracula
```

Your preferences are stored in `~/.local/share/llmd/llmd.db` and persist across sessions. To reset to defaults, delete the database:

```bash
rm ~/.local/share/llmd/llmd.db
```
