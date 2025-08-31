#!/bin/bash

# Heroku Deployment Script for Attendee Check-In App
# Make sure you have Heroku CLI installed and are logged in

echo "🚀 Starting Heroku deployment..."

# Check if app name is provided
if [ -z "$1" ]; then
    echo "❌ Please provide an app name: ./deploy-heroku.sh your-app-name"
    exit 1
fi

APP_NAME=$1

echo "📱 Deploying to Heroku app: $APP_NAME"

# Check if Heroku CLI is installed
if ! command -v heroku &> /dev/null; then
    echo "❌ Heroku CLI not found. Please install it first:"
    echo "   macOS: brew install heroku/brew/heroku"
    echo "   Windows: Download from https://devcenter.heroku.com/articles/heroku-cli"
    echo "   Linux: curl https://cli-assets.heroku.com/install.sh | sh"
    exit 1
fi

# Check if logged in to Heroku
if ! heroku auth:whoami &> /dev/null; then
    echo "🔐 Please login to Heroku first:"
    echo "   heroku login"
    exit 1
fi

# Create or connect to Heroku app
echo "🔗 Connecting to Heroku app..."
if heroku apps:info --app $APP_NAME &> /dev/null; then
    echo "✅ App $APP_NAME already exists, connecting..."
    heroku git:remote -a $APP_NAME
else
    echo "🆕 Creating new Heroku app: $APP_NAME"
    heroku create $APP_NAME
fi

# Build frontend assets
echo "🔨 Building frontend assets..."
npm run build

# Add all files to git
echo "📝 Adding files to git..."
git add .
git commit -m "Deploy to Heroku - $(date)"

# Push to Heroku
echo "🚀 Pushing to Heroku..."
git push heroku main

# Set environment variables (you'll need to update these)
echo "⚙️  Setting environment variables..."
echo "⚠️  IMPORTANT: You need to set these environment variables manually:"
echo ""
echo "heroku config:set GOOGLE_SHEET_ID=your_actual_sheet_id_here"
echo "heroku config:set GOOGLE_APPLICATION_CREDENTIALS='{\"type\":\"service_account\",...}'"
echo "heroku config:set GOOGLE_SHEET_RANGE=Sheet1!A:Z"
echo "heroku config:set NODE_ENV=production"
echo ""

# Open the app
echo "🌐 Opening your app..."
heroku open

echo ""
echo "✅ Deployment complete!"
echo "🔗 Your app is available at: https://$APP_NAME.herokuapp.com"
echo ""
echo "📋 Next steps:"
echo "1. Set your environment variables (see above)"
echo "2. Test the app thoroughly"
echo "3. Share the URL with your team"
echo ""
echo "📊 Check logs: heroku logs --tail -a $APP_NAME" 