# Highlights

Extract and save important passages from your markdown documentation.

## Overview

The highlights feature allows you to mark and save important text passages while reading your markdown files. Highlights are stored in a local SQLite database and persist across sessions. When you modify a file, llmd automatically tracks whether highlights are still valid.

## How It Works

### Creating Highlights

1. Open any markdown file in llmd
2. Select the text you want to highlight with your mouse
3. Click the "Create Highlight" button that appears
4. The text is immediately highlighted in yellow

### Viewing Highlights

**On the page:**
- Highlights appear with a yellow background and underline
- A summary box shows all highlights for the current file
- Click any highlight in the summary to scroll to it in the document

**In the highlights page:**
- Click "Highlights" in the sidebar under "Special Pages"
- View all highlights across your entire directory
- See which file each highlight belongs to
- Identify stale highlights (marked with ⚠️)

### Stale Highlights

When you edit a file, llmd checks if the highlighted text still exists:

- ✅ **Valid**: Text found at the same location → highlight updates automatically
- ✅ **Relocated**: Text found at a new location → offsets updated automatically  
- ⚠️ **Stale**: Text not found or appears multiple times → marked as stale

Stale highlights are displayed with:
- Red background and dashed border
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
~/.cache/llmd/events.db
```

The database includes:
- **Highlights**: Byte offsets, text content, timestamps, stale status
- **Resources**: File paths, content hashes, backup paths  
- **Validation**: SHA-256 hashes to detect file changes

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

## Limitations

- **Binary offsets**: Highlights use byte positions, not character positions
- **No line tracking**: Changes above a highlight shift its position
- **Single file only**: Can't highlight across multiple files
- **No categories**: All highlights are treated equally
- **No export**: Highlights are stored in SQLite only (not portable)

## Future Enhancements

Potential improvements for future versions:

- Export highlights to markdown/JSON
- Highlight categories and colors
- Search across all highlights
- Highlight notes and annotations
- Line-based tracking (more resilient to edits)
- Diff preview when restoring files
- Bulk operations (delete all stale, export all)
