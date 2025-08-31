#!/bin/bash

# Railway Build Script
echo "🚂 Railway Build Script Starting..."

# Install ALL dependencies (including dev dependencies needed for build)
echo "📦 Installing all dependencies..."
npm install

# Build the frontend assets
echo "🏗️ Building frontend assets..."
npm run build

# Verify build output
if [ -f "public/bundle.js" ]; then
    echo "✅ Build successful! bundle.js created."
    ls -la public/
else
    echo "❌ Build failed! bundle.js not found."
    exit 1
fi

# Clean up dev dependencies to reduce image size (optional)
echo "🧹 Cleaning up dev dependencies..."
npm prune --production

echo "🎉 Railway build complete!" 