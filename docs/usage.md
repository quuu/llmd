# Usage

## Basic Commands

```bash
# View llmd documentation
llmd docs

# Serve current directory
llmd

# Serve specific directory
llmd ./docs

# Open directly to analytics
llmd analytics
llmd analytics ~/my-project

# Manage analytics database
llmd db check                 # View database stats
llmd db cleanup --days 30     # Delete old events
llmd db clear                 # Clear all analytics data

# Dark mode with live reload
llmd ./docs --theme dark --watch

# Custom port
llmd ./docs --port 8080
```

## The `docs` Command

The `llmd docs` command provides instant access to llmd's documentation:

```bash
llmd docs
```

This command:
1. Clones the llmd repository to `~/.local/share/llmd-docs` (or `$XDG_DATA_HOME/llmd-docs`)
2. Uses the cached clone on subsequent runs
3. Opens the documentation in your browser automatically

To get a fresh copy of the docs:

```bash
rm -rf ~/.local/share/llmd-docs
llmd docs
```

## Command-Line Options

| Flag                   | Description                                                                | Default      |
| ---------------------- | -------------------------------------------------------------------------- | ------------ |
| `--port <number>`      | Port (0 = random)                                                          | `0` (random) |
| `--theme <name>`       | Theme (colors + fonts): `dark`, `light`, `nord`, `dracula`, `solarized`, `monokai`, or custom | `dark`* |
| `--open / --no-open`   | Auto-open browser                                                          | `--open`     |
| `--watch / --no-watch` | Live reload on changes                                                     | `--no-watch` |
| `--days <number>`      | Number of days for `db cleanup` command                                    | `30`         |
| `-h, --help`           | Show help                                                                  |              |
| `--version`            | Show version                                                               |              |

\* Theme preference is saved automatically. The default is used only on first run.

## Theme Persistence

llmd remembers your last theme choice. When you run llmd with `--theme`, that selection is saved and becomes your new default:

```bash
# First time - uses default (dark theme)
llmd ./docs

# Set your preferred theme
llmd ./docs --theme nord

# Next time - automatically uses nord
llmd ./docs

# Override saved preference temporarily
llmd ./docs --theme dracula
```

Your preference is stored in `~/.local/share/llmd/llmd.db` and persists across sessions. To reset to defaults, delete the database:

```bash
rm ~/.local/share/llmd/llmd.db
```

## Database Management

llmd stores analytics data and preferences in a local SQLite database at `~/.local/share/llmd/llmd.db` (or `$XDG_DATA_HOME/llmd/llmd.db`).

### Check Database Statistics

View information about your analytics database:

```bash
llmd db check
```

This shows:
- Database file location and size
- Total number of resources (files/directories) tracked
- Total number of events (page views)
- Oldest and newest event timestamps

### Clean Up Old Data

Delete events older than a specified number of days:

```bash
llmd db cleanup --days 30    # Delete events older than 30 days
llmd db cleanup --days 7     # Delete events older than 7 days
llmd db cleanup              # Uses default: 30 days
```

This command:
1. Deletes all events older than the specified threshold
2. Removes orphaned resources (files with no remaining events)
3. Shows count of deleted events and resources

### Clear All Data

Completely wipe the analytics database:

```bash
llmd db clear
```

This command:
1. Prompts for confirmation (requires typing "yeah really plz delete")
2. Deletes all events and resources
3. Runs VACUUM to reclaim disk space
4. Preserves theme preferences

**Warning**: This action cannot be undone.
