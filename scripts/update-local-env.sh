#!/bin/bash
# Update .env for local development

ENV_FILE="apps/api/.env"

echo "🔧 Updating $ENV_FILE for local development..."

# Check if file exists
if [ ! -f "$ENV_FILE" ]; then
    echo "❌ $ENV_FILE not found!"
    exit 1
fi

# Update MEILI_HOST
sed -i '' 's|MEILI_HOST=.*|MEILI_HOST=http://localhost:7700|g' "$ENV_FILE"

# Update MEILI_MASTER_KEY to match local Docker instance
sed -i '' 's|MEILI_MASTER_KEY=.*|MEILI_MASTER_KEY=masterKey|g' "$ENV_FILE"

# Update WEB_BASE_URL for local
sed -i '' 's|WEB_BASE_URL=https://.*|WEB_BASE_URL=http://localhost:3000|g' "$ENV_FILE"

echo "✅ Updated environment variables:"
echo "   MEILI_HOST=http://localhost:7700"
echo "   MEILI_MASTER_KEY=masterKey"
echo "   WEB_BASE_URL=http://localhost:3000"
echo ""
echo "🚀 Ready to run ingestion!"
