# Debugging Client-Side Code

## Setup

The project now supports debugging client-side JavaScript in Chrome DevTools with full source map support.

### Build for Development

Before debugging, build the client bundle with inline source maps:

```bash
./scripts/build-dev.sh
```

This creates `dist/client.js` with inline source maps that map back to the original TypeScript files in `src/client/`.

### VS Code Debug Configurations

Three debugging configurations are available:

1. **Debug Server** - Debug only the Bun server (Node.js debugger)
   - Automatically builds client with source maps before launching
   - Set breakpoints in `src/*.ts` server files

2. **Debug Client (Chrome)** - Debug only the client in Chrome
   - Requires server already running on port 3333
   - Set breakpoints in `src/client/*.ts` files
   - Chrome DevTools will show original TypeScript source

3. **Debug Server + Client** - Full-stack debugging (recommended)
   - Builds client with source maps
   - Starts server
   - Automatically opens Chrome when server is ready
   - Debug both server and client simultaneously

### How It Works

**Development Mode** (with source maps):
- Client bundle is served as separate file at `/_client.js`
- Inline source maps allow Chrome to map back to original TypeScript
- Set breakpoints in `src/client/*.ts` and they work in Chrome

**Production Mode** (without source maps):
- Client bundle is inlined into HTML
- Smaller, faster, no debugging info

The server automatically detects which mode to use based on whether source maps exist in the bundle.

## Usage

1. Hit F5 or select "Debug Server + Client" from the debug panel
2. Client bundle builds automatically
3. Server starts
4. Chrome opens with debugging enabled
5. Set breakpoints in `src/client/highlights.ts` or other client files
6. Breakpoints will bind and hit correctly

## Troubleshooting

If breakpoints are unbound:
1. Make sure you ran `./scripts/build-dev.sh` first
2. Check that `dist/client.js` exists and contains inline source maps
3. Verify Chrome DevTools Sources panel shows TypeScript files
4. Try reloading the page in Chrome

