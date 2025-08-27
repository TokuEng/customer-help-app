#!/bin/bash
# Get DigitalOcean App URL

echo "🔍 Finding your DigitalOcean App URL..."

# Check if doctl is installed
if ! command -v doctl &> /dev/null; then
    echo "❌ doctl CLI not found. Install with: brew install doctl"
    echo "   Or get URL manually from: https://cloud.digitalocean.com/apps"
    exit 1
fi

# Check if authenticated
if ! doctl auth list &> /dev/null; then
    echo "❌ Not authenticated. Run: doctl auth init"
    exit 1
fi

# List apps
echo "📋 Your DigitalOcean Apps:"
doctl apps list --format ID,Spec.Name,Live.URL

# Try to find customer help app specifically
APP_URL=$(doctl apps list --format Spec.Name,Live.URL --no-header | grep -i "customer\|help" | awk '{print $2}' | head -1)

if [ -n "$APP_URL" ]; then
    echo ""
    echo "🎯 Found your app URL: $APP_URL"
    echo ""
    echo "📝 Add this to your apps/api/.env file:"
    echo "WEB_BASE_URL=$APP_URL"
else
    echo ""
    echo "⚠️  Could not auto-detect app URL"
    echo "   Please copy the URL from the list above"
fi
