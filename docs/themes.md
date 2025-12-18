# Color Themes

llmd includes 6 built-in color themes:

- **dark** - Default dark theme (default)
- **light** - Warm light theme
- **nord** - Nord-inspired cool theme
- **dracula** - Dracula-inspired purple theme
- **solarized** - Solarized Light theme
- **monokai** - Monokai-inspired theme

## Custom Themes

Create custom color themes in your `themes.json` config file.

**Location:** `~/.config/llmd/themes.json` (or `$XDG_CONFIG_HOME/llmd/themes.json`)

### Format

All theme properties are required:

```json
{
  "colorThemes": {
    "mytheme": {
      "bg": "#1a1a1a",           // Main background
      "fg": "#e0e0e0",           // Main text color
      "border": "#333",          // Border color
      "hover": "#2a2a2a",        // Hover state background
      "accent": "#4a9eff",       // Accent color (links, etc.)
      "codeBg": "#2d2d2d",       // Code block background
      "sidebarBg": "#151515",    // Sidebar background
      "folderIcon": "#a78bfa",   // Folder icon color
      "fileIcon": "#fbbf24",     // File icon color
      "highlightBg": "#fbbf24",  // Active highlight background
      "highlightStaleBg": "#f97316"  // Stale highlight background
    }
  }
}
```

### Unified Config

You can combine both color themes and font themes in a single file:

```json
{
  "colorThemes": {
    "mytheme": { ... }
  },
  "fontThemes": {
    "myfont": { ... }
  }
}
```

### Usage

```bash
llmd --theme mytheme --fonts myfont
```

If a theme or font is not found, llmd will list all available options.

**Note:** The old flat format for color themes (without `colorThemes` key) is still supported for backward compatibility.

## Theme Persistence

llmd automatically remembers your last theme selection. Once you use a theme, it becomes your default for future sessions:

```bash
# First time
llmd --theme nord

# Next time - automatically uses nord
llmd
```

See [Usage](./usage.md#theme-persistence) for more details on theme persistence.
