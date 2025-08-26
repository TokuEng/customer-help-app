#!/bin/bash

# Deploy to DigitalOcean App Platform Script

echo "🚀 Deploying Customer Help Center to DigitalOcean..."

# Check if doctl is installed
if ! command -v doctl &> /dev/null; then
    echo "❌ doctl CLI not found. Please install it first:"
    echo "brew install doctl"
    exit 1
fi

# Check if authenticated
if ! doctl account get &> /dev/null; then
    echo "❌ Not authenticated with DigitalOcean. Run: doctl auth init"
    exit 1
fi

# Create app spec with environment variables
cat > app-spec-deploy-final.yaml << 'EOF'
name: customer-help-center
region: sfo3

services:
  - name: web
    git:
      repo_clone_url: https://github.com/TokuEng/customer-help-app.git
      branch: main
    source_dir: /apps/web
    build_command: npm install && npm run build
    run_command: npm start
    http_port: 3000
    instance_count: 1
    instance_size_slug: basic-xs
    envs:
      - key: NODE_ENV
        value: production
      - key: NEXT_PUBLIC_API_URL
        value: ${APP_URL}/api
      - key: REVALIDATE_TOKEN
        type: SECRET
        value: "MJHXGOOpaglqgS3f+4l3P6aYXfoYlE3LghMSHt9w7gw="
    routes:
      - path: /
  
  - name: api
    git:
      repo_clone_url: https://github.com/TokuEng/customer-help-app.git
      branch: main
    source_dir: /apps/api
    dockerfile_path: /apps/api/Dockerfile
    http_port: 8080
    instance_count: 1
    instance_size_slug: basic-xs
    envs:
      - key: DATABASE_URL
        value: ${customer-help-db.DATABASE_URL}
      - key: MEILI_HOST
        value: "http://10.124.0.39:7700"
      - key: MEILI_MASTER_KEY
        type: SECRET
        value: "NzEzYTdkNjQ0N2FiYjFkODg0NzdjNzNk"
      - key: NOTION_TOKEN
        type: SECRET
        value: "ntn_S31097131812gWkADDpZzrDN7Nv3wyyMLwbSbXKRQcC556"
      - key: NOTION_INDEX_PAGE_ID
        value: "2030b95a751d80eaac8df6267041fb14"
      - key: EMBEDDINGS_PROVIDER
        value: openai
      - key: OPENAI_API_KEY
        type: SECRET
        value: "REPLACE_WITH_YOUR_NEW_OPENAI_KEY"
      - key: REVALIDATE_TOKEN
        type: SECRET
        value: "MJHXGOOpaglqgS3f+4l3P6aYXfoYlE3LghMSHt9w7gw="
      - key: WEB_BASE_URL
        value: ${APP_URL}
    routes:
      - path: /api
EOF

echo "📝 Please update OPENAI_API_KEY in app-spec-deploy-final.yaml"
echo ""
echo "Choose deployment method:"
echo "1) Create new app"
echo "2) Update existing app"
read -p "Enter choice (1 or 2): " choice

case $choice in
    1)
        echo "Creating new app..."
        doctl apps create --spec app-spec-deploy-final.yaml
        echo ""
        echo "✅ App created! Save the app ID for future updates."
        echo "To get app ID: doctl apps list"
        ;;
    2)
        read -p "Enter your app ID: " app_id
        echo "Updating app $app_id..."
        doctl apps update $app_id --spec app-spec-deploy-final.yaml
        echo "✅ App updated!"
        ;;
    *)
        echo "Invalid choice"
        exit 1
        ;;
esac

echo ""
echo "🎉 Deployment complete!"
echo ""
echo "Next steps:"
echo "1. Get your app URL: doctl apps get <app-id>"
echo "2. Update WEB_BASE_URL with the actual URL"
echo "3. Deploy functions for ingestion"
echo "4. Run initial sync"
