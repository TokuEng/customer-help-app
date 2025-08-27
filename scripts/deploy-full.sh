#!/bin/bash
set -e

echo "🚀 Complete DigitalOcean Deployment"
echo "=================================="

# Check if required environment variables are set
REQUIRED_VARS=(
    "SPACES_KEY"
    "SPACES_SECRET" 
    "MEILI_MASTER_KEY"
    "NOTION_TOKEN"
    "NOTION_INDEX_PAGE_ID"
    "EMBEDDINGS_PROVIDER"
    "OPENAI_API_KEY"
    "REVALIDATE_TOKEN"
)

MISSING_VARS=()
for var in "${REQUIRED_VARS[@]}"; do
    if [[ -z "${!var}" ]]; then
        MISSING_VARS+=("$var")
    fi
done

if [[ ${#MISSING_VARS[@]} -gt 0 ]]; then
    echo "❌ Missing required environment variables:"
    for var in "${MISSING_VARS[@]}"; do
        echo "   $var"
    done
    echo ""
    echo "💡 Load from your .env file:"
    echo "   source apps/api/.env"
    echo ""
    echo "   Or set manually:"
    for var in "${MISSING_VARS[@]}"; do
        echo "   export $var='your_value_here'"
    done
    exit 1
fi

echo "✅ All required environment variables are set"

APP_ID="b19d264a-fc0f-4736-8451-251cb8ebc3e2"

echo "📦 Building and pushing Docker images..."

echo "🔨 Building WEB image..."
docker build --no-cache --platform linux/amd64 \
  -t registry.digitalocean.com/workco/customer-help-web:latest \
  -f apps/web/Dockerfile apps/web

echo "⬆️  Pushing WEB image..."
docker push registry.digitalocean.com/workco/customer-help-web:latest

echo "🔨 Building API image..."
docker build --no-cache --platform linux/amd64 \
  -t registry.digitalocean.com/workco/customer-help-api:latest \
  -f apps/api/Dockerfile apps/api

echo "⬆️  Pushing API image..."
docker push registry.digitalocean.com/workco/customer-help-api:latest

echo "🎯 Updating DigitalOcean App..."
doctl apps update $APP_ID --spec .do/app.yaml

echo "✅ Deployment initiated!"
echo ""
echo "📊 Check deployment status:"
echo "   doctl apps get $APP_ID"
echo ""
echo "🔗 Get app URL:"
echo "   doctl apps get $APP_ID --format URL"
