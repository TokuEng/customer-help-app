#!/bin/bash

# Script to set the ADMIN_KEY for DigitalOcean deployment

echo "🔐 Setting Admin Key for Customer Help Center"
echo "=========================================="

# Check if doctl is installed
if ! command -v doctl &> /dev/null; then
    echo "❌ doctl CLI not found. Please install it first:"
    echo "   brew install doctl"
    exit 1
fi

# Check if authenticated
if ! doctl account get &> /dev/null; then
    echo "❌ Not authenticated with DigitalOcean. Please run:"
    echo "   doctl auth init"
    exit 1
fi

# Get app ID
APP_NAME="customer-help-app"
echo "🔍 Finding app: $APP_NAME"

APP_ID=$(doctl apps list --format ID,Spec.Name --no-header | grep "$APP_NAME" | awk '{print $1}')

if [ -z "$APP_ID" ]; then
    echo "❌ App not found: $APP_NAME"
    echo "   Make sure the app is deployed first"
    exit 1
fi

echo "✅ Found app: $APP_ID"

# Generate a secure admin key
ADMIN_KEY=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-32)
echo "🔑 Generated admin key: $ADMIN_KEY"

# Set the environment variable
echo "📝 Setting ADMIN_KEY environment variable..."
doctl apps update $APP_ID --spec - <<EOF
name: $APP_NAME
services:
- name: web
  envs:
  - key: ADMIN_KEY
    value: "$ADMIN_KEY"
    type: SECRET
EOF

if [ $? -eq 0 ]; then
    echo "✅ Admin key set successfully!"
    echo ""
    echo "⚠️  IMPORTANT: Save this admin key securely!"
    echo "    Admin Key: $ADMIN_KEY"
    echo ""
    echo "📝 To access the admin panel:"
    echo "   1. Go to https://your-app.ondigitalocean.app/admin"
    echo "   2. Enter the admin key when prompted"
    echo ""
    echo "🔒 To change the admin key later, run this script again"
else
    echo "❌ Failed to set admin key"
    exit 1
fi
