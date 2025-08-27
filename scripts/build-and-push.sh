#!/bin/bash

echo "🐳 Building and pushing Docker images to DigitalOcean Container Registry"

# Check if logged in to registry
if ! doctl registry login --expiry-seconds 600 2>/dev/null; then
    echo "❌ Failed to login to registry. Make sure you're authenticated with doctl"
    exit 1
fi

# Build and push Web image
echo "📦 Building Web (Next.js) image for linux/amd64..."
docker buildx build --platform linux/amd64 -t registry.digitalocean.com/workco/customer-help-web:latest -f apps/web/Dockerfile apps/web --push
echo "✅ Web image pushed"

# Build and push API image
echo "📦 Building API (FastAPI) image for linux/amd64..."
docker buildx build --platform linux/amd64 -t registry.digitalocean.com/workco/customer-help-api:latest -f apps/api/Dockerfile apps/api --push
echo "✅ API image pushed"

echo "🎉 All images pushed successfully!"
echo ""
echo "Next steps:"
echo "1. Create app in DigitalOcean using the Docker images"
echo "2. Or update existing app with: doctl apps update <app-id> --spec .do/app.yaml"
