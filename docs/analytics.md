# Analytics

llmd includes built-in usage analytics to help you understand which documentation you actually read. All data is stored locally in a SQLite database - nothing is sent to external servers.

**Analytics is enabled by default.** You can disable it at any time using `llmd analytics disable`.

## Features

- **Most Viewed Documents** - See which docs you reference most frequently
- **Activity Timeline** - 7-day chart of your documentation views
- **Zero-View Detection** - Find docs you generated but never read
- **Directory Filtering** - View analytics for current project or all history
- **Privacy-First** - All data stored locally at `~/.local/share/llmd/llmd.db`

## Commands

### View Analytics

Open the analytics dashboard:

```bash
# View analytics for current directory
llmd analytics

# View analytics for specific directory
llmd analytics view ~/my-project

# "view" is the default subcommand, so this is equivalent:
llmd analytics ~/my-project
```

The analytics page shows:
- Overview stats (total events, resources, viewed/unviewed docs)
- Top 20 most-viewed documents
- Activity bar chart (last 7 days)
- List of documents with zero views

You can also access analytics:
1. **Click the Analytics link** in the sidebar
2. **Navigate directly** to `http://localhost:<port>/analytics`

### Enable/Disable Analytics

Analytics is **enabled by default**. You can disable or re-enable it:

```bash
# Disable analytics tracking
llmd analytics disable

# Re-enable analytics tracking
llmd analytics enable
```

The setting is stored in the database at `~/.local/share/llmd/llmd.db` and persists across sessions.

## Database

The database stores both analytics events and highlights data at `~/.local/share/llmd/llmd.db`.

### Database Management

Manage your analytics database:

```bash
# View database statistics
llmd db check

# Delete events older than 30 days
llmd db cleanup --days 30

# Clear all analytics data
llmd db clear
```

See the [Database Management](#database-management-1) section below for details.

## Configuration Priority

llmd checks for analytics enablement in this order:

1. **Environment variable** (highest priority)
   - If `LLMD_ENABLE_EVENTS` is set (any truthy value), analytics is enabled
   - Overrides database configuration

2. **Database configuration**
   - Set via `llmd analytics enable` or `llmd analytics disable`
   - Persists across sessions

3. **Default: Disabled**
   - If neither environment variable nor database config is set, analytics is disabled

## Privacy & Opt-In

Analytics is **opt-in** and respects your privacy:

- All data is stored locally in `~/.local/share/llmd/llmd.db` (or `$XDG_DATA_HOME/llmd/llmd.db`)
- No data is ever sent to external servers
- No personal information is collected beyond file paths and view counts
- Database can be deleted at any time

### Enabling with Environment Variable

You can also enable analytics temporarily with an environment variable:

```bash
export LLMD_ENABLE_EVENTS=1
llmd
```

Or add to your shell profile (`.bashrc`, `.zshrc`, etc.):

```bash
echo 'export LLMD_ENABLE_EVENTS=1' >> ~/.zshrc
```

You can use any truthy value (not just `1`):

```bash
export LLMD_ENABLE_EVENTS=true
export LLMD_ENABLE_EVENTS=yes
export LLMD_ENABLE_EVENTS=enabled
```

**Note:** The environment variable always takes precedence over the database configuration.

## What's Tracked

- **Directory open events** - When you start llmd in a directory
- **File view events** - When you open a markdown file in the browser
- **Resources** - Files and directories in your served directories (excluding `node_modules`, `.git`, `dist`, `build`)

**Not tracked:** File contents, edit events, or any data outside the directories you explicitly serve.

## Database Management

llmd provides commands to help you manage your analytics database.

### Check Database Stats

View database size and usage statistics:

```bash
llmd db check
```

**Output example:**
```
Database Statistics:
  Location: /Users/you/.local/share/llmd/llmd.db
  Size: 2.45 MB (2,568,192 bytes)
  Resources: 543
  Events: 1,234
  Oldest event: 1/15/2024, 3:45:00 PM
  Newest event: 2/18/2024, 10:30:00 AM
```

This helps you understand:
- Where your database is stored
- How much disk space it's using
- How many files/directories are tracked
- How many page view events are recorded
- The date range of your analytics data

### Clean Up Old Events

Delete events older than a specified number of days:

```bash
# Delete events older than 30 days (default)
llmd db cleanup

# Delete events older than 7 days
llmd db cleanup --days 7

# Delete events older than 90 days
llmd db cleanup --days 90
```

**What it does:**
1. Deletes all events older than the threshold
2. Removes orphaned resources (files with no remaining events)
3. Shows how many events and resources were deleted

**Output example:**
```
Cleanup Results:
  Deleted events: 456
  Deleted resources: 123
```

**Note:** This preserves recent analytics data while freeing up disk space. Theme preferences are not affected.

### Clear All Data

Completely wipe the analytics database:

```bash
llmd db clear
```

**What it does:**
1. Prompts for confirmation (you must type `yeah really plz delete`)
2. Deletes all events and resources
3. Runs VACUUM to reclaim disk space
4. Preserves theme preferences

**Warning:** This action cannot be undone. All analytics history will be permanently deleted.

### Size Warning

llmd will warn you if the analytics database exceeds 50MB:

```
[events] Database size is 51.00MB (threshold: 50MB)
[events] Consider using: llmd db cleanup
```

When you see this warning, consider:
- Running `llmd db cleanup` to delete old events
- Running `llmd db clear` if you want to start fresh
- Adjusting how frequently you clean up (e.g., cleanup every 30 days)

### Manual Cleanup

You can also manually delete the database file:

```bash
rm ~/.local/share/llmd/llmd.db
```

The database will be recreated automatically the next time you run llmd with analytics enabled. However, using `llmd db clear` is preferred as it properly handles the database cleanup.
