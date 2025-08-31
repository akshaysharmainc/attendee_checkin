#!/bin/bash

# Railway Deployment Script for Attendee Check-In App
# This script prepares your app for Railway deployment

echo "🚂 Preparing for Railway deployment..."

# Check if Railway CLI is installed
if ! command -v railway &> /dev/null; then
    echo "❌ Railway CLI not found. Installing..."
    npm install -g @railway/cli
else
    echo "✅ Railway CLI found"
fi

# Build frontend assets
echo "🔨 Building frontend assets..."
npm run build

# Check if build was successful
if [ ! -f "public/bundle.js" ]; then
    echo "❌ Build failed! bundle.js not found"
    exit 1
fi

echo "✅ Build successful!"

# Login to Railway
echo "🔐 Logging in to Railway..."
railway login

# Create new project
echo "🚀 Creating new Railway project..."
railway init

echo ""
echo "🎉 Railway project created!"
echo ""
echo "📋 Next steps:"
echo "1. Set your environment variables in Railway dashboard:"
echo "   - GOOGLE_SHEET_ID=your_sheet_id"
echo "   - GOOGLE_APPLICATION_CREDENTIALS={\"type\":\"service_account\",...}"
echo "   - GOOGLE_SHEET_RANGE=Sheet1!A:Z"
echo "   - NODE_ENV=production"
echo ""
echo "2. Deploy your app:"
echo "   railway up"
echo ""
echo "3. Get your public URL:"
echo "   railway domain"
echo ""
echo "4. Share the URL with your team!"
echo ""
echo "📖 For detailed steps, see QUICK_DEPLOY_ALTERNATIVES.md" 