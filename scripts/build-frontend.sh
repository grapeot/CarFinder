#!/bin/bash
# Exit on error
set -e

echo "Starting frontend build process..."

# Navigate to frontend directory
cd "$(dirname "$0")/../frontend"

# Build the project
npm run build

# Ensure static directory exists in parent
mkdir -p ../static

# Copy build artifacts to static directory
# Vite by default builds to 'dist'
echo "Copying dist files to static directory..."
cp -r dist/* ../static/

echo "Build complete. Files are ready in the 'static' directory."
