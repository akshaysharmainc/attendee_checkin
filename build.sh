#!/bin/bash

# Production Build Script for Railway
echo "🔨 Building production assets..."

# Install dependencies
echo "📦 Installing dependencies..."
npm ci --only=production

# Install dev dependencies for build
echo "🔧 Installing build dependencies..."
npm install --save-dev webpack webpack-cli css-loader style-loader

# Build frontend assets
echo "🏗️ Building frontend assets..."
npm run build

# Verify build
if [ -f "public/bundle.js" ]; then
    echo "✅ Build successful! bundle.js created."
    ls -la public/
else
    echo "❌ Build failed! bundle.js not found."
    exit 1
fi

echo "🎉 Production build complete!" 