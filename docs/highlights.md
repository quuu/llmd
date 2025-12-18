# Highlights

Extract and save important passages from your markdown documentation.

**Highlights is enabled by default.** You can disable it at any time using `llmd highlights disable`.

## Overview

The highlights feature allows you to mark and save important text passages while reading your markdown files. Highlights are stored in a local SQLite database and persist across sessions. When you modify a file, llmd automatically tracks whether highlights are still valid.

## How It Works

### Creating Highlights

1. Open any markdown file in llmd
2. Select the text you want to highlight with your mouse
3. A popup appears near your selection with:
   - An optional notes text area
   - A "Create Highlight" button
   - A close button (×) to dismiss without saving
4. Add notes (optional) or click "Create Highlight"
5. The text is immediately highlighted with your theme's highlight color

The highlight is saved to the database and will persist across sessions.

### Viewing Highlights

**On the page:**
- Highlights appear with your theme's highlight color and a border
- A summary box shows all highlights for the current file
- Click any highlight in the summary to scroll to it in the document

**In the highlights page:**
- Click "Highlights" in the sidebar under "Admin"
- View all highlights across your entire directory
- See which file each highlight belongs to
- Identify stale highlights (marked with ⚠️)

### Stale Highlights

When you edit a file, llmd checks if the highlighted text still exists:

- ✅ **Valid**: Text found at the same location → highlight updates automatically
- ✅ **Relocated**: Text found at a new location → offsets updated automatically  
- ⚠️ **Stale**: Text not found or appears multiple times → marked as stale

Stale highlights are displayed with:
- Your theme's stale highlight color and dashed border
- Warning icon in the summary
- Option to restore the original file

### File Backups

The first time you create a highlight in a file, llmd automatically creates a backup in:

```
~/.cache/llmd/file-backups/{resource-id}_{timestamp}.md
```

This backup lets you restore the file to its original state if highlights become stale.

## Storage

All highlights data is stored in the llmd SQLite database at:

```
~/.local/share/llmd/llmd.db
```

The database includes:
- **Highlights**: Byte offsets, text content, timestamps, stale status, notes
- **Resources**: File paths, content hashes, backup paths  
- **Validation**: SHA-256 hashes to detect file changes
- **Analytics**: Usage events and statistics (if analytics is enabled)

## Technical Details

### Offset-Based Tracking

Highlights use byte offsets (UTF-8 encoding) to track text positions:

```typescript
{
  startOffset: 150,    // Start position in bytes
  endOffset: 225,      // End position in bytes
  highlightedText: "..." // Original text for validation
}
```

This approach:
- ✅ Doesn't lock files (you can edit freely)
- ✅ Fast validation and rendering
- ✅ Works across different editors
- ⚠️ Breaks when text is moved or deleted (marked as stale)

### Validation Strategy

When loading a file, llmd validates each highlight:

1. **Hash check**: Compare current file hash to stored hash
2. **Exact match**: Check if text exists at the stored offsets
3. **Grep search**: Try to find text elsewhere in the file
4. **Mark stale**: If text not found or found multiple times

### Restoration Options

When restoring a file from backup:

- **Replace**: Overwrites the current file (⚠️ loses recent changes)
- **Timestamped Copy**: Creates a new file like `file_1234567890.md` (✅ safe)

## API

The highlights feature exposes REST API endpoints:

### POST `/api/highlights`
Create a new highlight.

**Request:**
```json
{
  "resourcePath": "README.md",
  "startOffset": 100,
  "endOffset": 250,
  "highlightedText": "The actual text content"
}
```

**Response:**
```json
{
  "id": "fac85465-1ef1-4465-9714-27840a4e3770"
}
```

### GET `/api/highlights/resource?path=...`
Get all highlights for a specific file.

**Response:**
```json
{
  "highlights": [
    {
      "id": "...",
      "startOffset": 100,
      "endOffset": 250,
      "highlightedText": "...",
      "isStale": false,
      "createdAt": 1703001234567,
      "updatedAt": 1703001234567
    }
  ]
}
```

### GET `/api/highlights/directory?path=...`
Get all highlights in a directory.

### DELETE `/api/highlights/:id`
Delete a highlight.

### POST `/api/highlights/:id/restore`
Restore file from backup.

**Request:**
```json
{
  "useTimestamp": true  // true = timestamped copy, false = replace
}
```

## CLI Commands

### Enable/Disable Highlights

Highlights is **enabled by default**. You can disable or re-enable it:

```bash
# Disable highlights feature
llmd highlights disable

# Re-enable highlights feature
llmd highlights enable
```

The setting is stored in the database at `~/.local/share/llmd/llmd.db` and persists across sessions. When disabled, the highlight creation UI and API endpoints will not be available.

### Export Highlights

Export all highlights from a directory to a markdown file:

```bash
llmd export              # Export current directory
llmd export ./docs       # Export specific directory
```

Exports are saved to `~/.llmd/{directory}-{date}.md` with:
- File grouping by document
- Creation timestamps
- Original highlighted text
- Any notes (if added)

### Archive Management

The archive stores backup copies of files when highlights are created.

**List backups:**
```bash
llmd archive list
```

**Show backup details:**
```bash
llmd archive show README.md
```

**Clear all backups:**
```bash
llmd archive clear
```

Archive location: `~/.cache/llmd/file-backups/`

## Limitations

- **Binary offsets**: Highlights use byte positions, not character positions
- **No line tracking**: Changes above a highlight shift its position
- **Single file only**: Can't highlight across multiple files
- **No categories**: All highlights are treated equally

## Future Enhancements

Potential improvements for future versions:

- Highlight categories and colors
- Search across all highlights
- Highlight notes and annotations
- Line-based tracking (more resilient to edits)
- Diff preview when restoring files
