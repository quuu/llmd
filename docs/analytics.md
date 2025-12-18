# Analytics

llmd includes built-in usage analytics to help you understand which documentation you actually read. All data is stored locally in a SQLite database - nothing is sent to external servers.

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

### Enable Analytics

Enable analytics tracking:

```bash
llmd analytics enable
```

This stores the setting in the database at `~/.local/share/llmd/llmd.db`. Analytics will remain enabled until you explicitly disable it.

### Disable Analytics

Disable analytics tracking:

```bash
llmd analytics disable
```

This updates the database configuration. No events will be tracked until you re-enable analytics.

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

### Size Warning

llmd will warn you if the analytics database exceeds 50MB:

```
[events] Database size is 51.00MB (threshold: 50MB)
[events] Consider deleting old data: rm ~/.local/share/llmd/llmd.db
```

### Manual Cleanup

To reset all analytics data, simply delete the database:

```bash
rm ~/.local/share/llmd/llmd.db
```

The database will be recreated automatically the next time you run llmd with analytics enabled.
