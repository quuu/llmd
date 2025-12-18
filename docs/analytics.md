# Analytics

llmd includes built-in usage analytics to help you understand which documentation you actually read. All data is stored locally in a SQLite database - nothing is sent to external servers.

## Features

- **Most Viewed Documents** - See which docs you reference most frequently
- **Activity Timeline** - 7-day chart of your documentation views
- **Zero-View Detection** - Find docs you generated but never read
- **Directory Filtering** - View analytics for current project or all history
- **Privacy-First** - All data stored locally at `~/.local/share/llmd/events.db`

## Usage

Access analytics in three ways:

1. **Click the Analytics link** in the sidebar
2. **Navigate directly** to `http://localhost:<port>/analytics`
3. **Use the analytics command**: `llmd analytics` or `llmd analytics ~/your-project`

The analytics page shows:
- Overview stats (total events, resources, viewed/unviewed docs)
- Top 20 most-viewed documents
- Activity bar chart (last 7 days)
- List of documents with zero views

## Privacy & Opt-In

Analytics is **opt-in** and respects your privacy:

- All data is stored locally in `~/.local/share/llmd/events.db` (or `$XDG_DATA_HOME/llmd/events.db`)
- No data is ever sent to external servers
- No personal information is collected beyond file paths and view counts
- Database can be deleted at any time

To **enable analytics**, set the environment variable:

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

## What's Tracked

- **Directory open events** - When you start llmd in a directory
- **File view events** - When you open a markdown file in the browser
- **Resources** - Files and directories in your served directories (excluding `node_modules`, `.git`, `dist`, `build`)

**Not tracked:** File contents, edit events, or any data outside the directories you explicitly serve.
