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

```json
{
  "colorThemes": {
    "mytheme": {
      "bg": "#1a1a1a",
      "fg": "#e0e0e0",
      "border": "#333",
      "hover": "#2a2a2a",
      "accent": "#4a9eff",
      "codeBg": "#2d2d2d",
      "sidebarBg": "#151515",
      "folderIcon": "#a78bfa",
      "fileIcon": "#fbbf24"
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
