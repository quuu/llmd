#!/bin/bash
# Dev build script for llmd (with source maps for debugging)

set -e

echo "Cleaning previous builds..."
rm -f dist/client.js dist/client.js.map

echo "Creating dist directory..."
mkdir -p dist

echo "Building client bundle with source maps..."
bun build --target=browser --sourcemap=inline ./src/client-bundle.ts --outfile=dist/client.js

echo "✓ Dev build complete! Source maps enabled for debugging."

