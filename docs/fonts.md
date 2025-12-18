# Font Combinations

llmd includes 9 built-in font combinations:

- **serif** - System serif fonts (Georgia, Times)
- **sans** - System sans-serif fonts (default)
- **mono** - System monospace fonts
- **classic** - Baskerville headings + Geist body
- **future** - Space Mono headings + Space Grotesk body
- **modern** - Inter throughout + JetBrains Mono
- **artsy** - Playfair Display + Fira Code
- **literary** - Spectral headings + Newsreader body
- **editorial** - Bitter headings + Lora body

All custom fonts are loaded from Google Fonts CDN for fast, reliable delivery.

## Custom Fonts

Create custom font combinations in your `themes.json` config file.

**Location:** `~/.config/llmd/themes.json` (or `$XDG_CONFIG_HOME/llmd/themes.json`)

### Simple Example (Auto-loaded from Google Fonts)

```json
{
  "fontThemes": {
    "myfont": {
      "heading": "Montserrat, sans-serif",
      "body": "Open Sans, sans-serif",
      "code": "Source Code Pro, monospace"
    }
  }
}
```

Google Fonts are **loaded automatically** with weights 400 and 700. Just specify the font family names - no need to construct Google Fonts URLs manually!

### Advanced Example (Custom Weights/Styles)

```json
{
  "fontThemes": {
    "custom": {
      "heading": "Poppins, sans-serif",
      "body": "Inter, sans-serif",
      "code": "Fira Code, monospace",
      "googleFontsUrl": "https://fonts.googleapis.com/css2?family=Poppins:wght@400;600;700&family=Inter:wght@300;400;500&family=Fira+Code:wght@400;500&display=swap"
    }
  }
}
```

Use `googleFontsUrl` only if you need specific weights (like 300, 500, 600) or styles (italic, etc.). Get custom URLs from [Google Fonts](https://fonts.google.com).

### Usage

```bash
llmd --fonts myfont
```

### Requirements

- `heading`, `body`, and `code` properties are required
- Font names should include CSS fallbacks (e.g., `"Roboto, sans-serif"`)
- System fonts (Arial, Georgia, etc.) don't load from Google Fonts
- Invalid font names will show helpful errors listing all available fonts

## Font Persistence

llmd automatically remembers your last font selection. Once you use a font combination, it becomes your default for future sessions:

```bash
# First time
llmd --fonts modern

# Next time - automatically uses modern
llmd
```

See [Usage](./usage.md#theme-persistence) for more details on theme and font persistence.
