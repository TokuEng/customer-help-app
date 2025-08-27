#!/bin/bash
# Deploy to DigitalOcean with environment variables
set -e

echo "🚀 Deploying Customer Help Center to DigitalOcean"
echo "=================================================="

# Check if doctl is installed
if ! command -v doctl &> /dev/null; then
    echo "❌ doctl CLI not found. Please install it:"
    echo "   brew install doctl"
    echo "   Or visit: https://docs.digitalocean.com/reference/doctl/how-to/install/"
    exit 1
fi

# Check if user is authenticated
if ! doctl auth list &> /dev/null; then
    echo "❌ Not authenticated with DigitalOcean"
    echo "   Run: doctl auth init"
    exit 1
fi

echo "✅ doctl CLI ready"

# Load environment variables from local .env file
ENV_FILE="apps/api/.env"
if [ ! -f "$ENV_FILE" ]; then
    echo "❌ Environment file not found: $ENV_FILE"
    echo "   Create this file with your secrets"
    exit 1
fi

echo "📁 Loading environment from: $ENV_FILE"

# Source the .env file
set -a
source "$ENV_FILE"
set +a

# Check required variables
REQUIRED_VARS=(
    "MEILI_MASTER_KEY"
    "NOTION_TOKEN" 
    "OPENAI_API_KEY"
    "REVALIDATE_TOKEN"
    "SPACES_KEY"
    "SPACES_SECRET"
)

echo "🔍 Checking required environment variables..."
for var in "${REQUIRED_VARS[@]}"; do
    if [ -z "${!var}" ]; then
        echo "❌ Missing required variable: $var"
        echo "   Add it to $ENV_FILE"
        exit 1
    else
        echo "✅ $var is set"
    fi
done

# Deploy using doctl
APP_NAME="customer-help-app"
SPEC_FILE="app-spec-deploy.yaml"

echo "📦 Deploying app: $APP_NAME"
echo "📋 Using spec: $SPEC_FILE"

# Set environment variables for the deployment
export MEILI_MASTER_KEY
export NOTION_TOKEN
export OPENAI_API_KEY
export REVALIDATE_TOKEN
export SPACES_KEY
export SPACES_SECRET

echo "🚀 Starting deployment..."

# Deploy the app
if doctl apps list | grep -q "$APP_NAME"; then
    echo "♻️  Updating existing app..."
    APP_ID=$(doctl apps list --format ID,Spec.Name --no-header | grep "$APP_NAME" | awk '{print $1}')
    doctl apps update "$APP_ID" --spec "$SPEC_FILE"
else
    echo "🆕 Creating new app..."
    doctl apps create --spec "$SPEC_FILE"
fi

echo "✅ Deployment initiated!"
echo "🔗 Check status at: https://cloud.digitalocean.com/apps"
echo "📊 Monitor with: doctl apps list"