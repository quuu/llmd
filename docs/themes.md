# Themes

llmd includes 6 built-in themes (each pairs colors with fonts):

- **dark** - Dark theme with sans-serif fonts (default)
- **light** - Warm light theme with serif fonts
- **nord** - Nord-inspired cool theme with modern fonts
- **dracula** - Dracula-inspired purple theme with futuristic fonts
- **solarized** - Solarized Light with literary fonts
- **monokai** - Monokai-inspired theme with monospace fonts

## Custom Themes

Create custom themes in your `themes.json` config file. Each theme includes both colors and fonts.

**Location:** `~/.config/llmd/themes.json` (or `$XDG_CONFIG_HOME/llmd/themes.json`)

### Format

All theme properties are required:

```json
{
  "themes": {
    "mytheme": {
      "colors": {
        "bg": "#1a1a1a",                // Main background
        "fg": "#e0e0e0",                // Main text color
        "border": "#333",               // Border color
        "hover": "#2a2a2a",             // Hover state background
        "accent": "#4a9eff",            // Accent color (links, etc.)
        "codeBg": "#2d2d2d",            // Code block background
        "sidebarBg": "#151515",         // Sidebar background
        "folderIcon": "#a78bfa",        // Folder icon color
        "fileIcon": "#fbbf24",          // File icon color
        "highlightBg": "#fbbf24",       // Active highlight background
        "highlightStaleBg": "#f97316"   // Stale highlight background
      },
      "fonts": {
        "body": "Georgia, serif",       // Body text font
        "heading": "Georgia, serif",    // Heading font
        "code": "Monaco, monospace",    // Code font
        "googleFontsUrl": "https://..."  // Optional: Google Fonts URL
      }
    }
  }
}
```

### Google Fonts

If your theme uses Google Fonts, include the `googleFontsUrl` property with the full Google Fonts CSS import URL:

```json
{
  "themes": {
    "elegant": {
      "colors": { ... },
      "fonts": {
        "body": "Open Sans, sans-serif",
        "heading": "Montserrat, sans-serif",
        "code": "Source Code Pro, monospace",
        "googleFontsUrl": "https://fonts.googleapis.com/css2?family=Montserrat:wght@400;700&family=Open+Sans:wght@400;700&family=Source+Code+Pro:wght@400;700&display=swap"
      }
    }
  }
}
```

For system fonts only, omit the `googleFontsUrl` property.

### Usage

```bash
llmd --theme mytheme
```

If a theme is not found, llmd will list all available options.

See [themes.example.json](../themes.example.json) for complete examples.

## Theme Persistence

llmd automatically remembers your last theme selection. Once you use a theme, it becomes your default for future sessions:

```bash
# First time
llmd --theme nord

# Next time - automatically uses nord
llmd
```

See [Usage](./usage.md#theme-persistence) for more details on theme persistence.

## Adjusting Fonts

If you like a built-in theme's colors but want different fonts, create a custom theme:

```json
{
  "themes": {
    "nord-serif": {
      "colors": {
        "bg": "#2e3440",
        "fg": "#d8dee9",
        "border": "#3b4252",
        "hover": "#434c5e",
        "accent": "#88c0d0",
        "codeBg": "#3b4252",
        "sidebarBg": "#2e3440",
        "folderIcon": "#81a1c1",
        "fileIcon": "#ebcb8b",
        "highlightBg": "#ebcb8b",
        "highlightStaleBg": "#bf616a"
      },
      "fonts": {
        "body": "Georgia, serif",
        "heading": "Georgia, serif",
        "code": "Monaco, monospace"
      }
    }
  }
}
```

Then use it with `llmd --theme nord-serif`.
