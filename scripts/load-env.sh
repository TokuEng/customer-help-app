#!/bin/bash

# Helper script to load environment variables from .env file for deployment

ENV_FILE="apps/api/.env"

if [[ ! -f "$ENV_FILE" ]]; then
    echo "❌ Environment file not found: $ENV_FILE"
    echo "   Please ensure your .env file exists"
    exit 1
fi

echo "📋 Loading environment variables from $ENV_FILE..."

# Load environment variables from .env file
set -a  # Automatically export all variables
source "$ENV_FILE"
set +a  # Stop auto-exporting

echo "✅ Environment variables loaded successfully!"
echo ""
echo "🔍 Loaded variables:"
echo "   NOTION_TOKEN: ${NOTION_TOKEN:0:10}..." 
echo "   OPENAI_API_KEY: ${OPENAI_API_KEY:0:10}..."
echo "   SPACES_KEY: ${SPACES_KEY:0:10}..."
echo "   MEILI_MASTER_KEY: ${MEILI_MASTER_KEY:0:10}..."
echo "   REVALIDATE_TOKEN: ${REVALIDATE_TOKEN:0:10}..."
echo "   NOTION_INDEX_PAGE_ID: $NOTION_INDEX_PAGE_ID"
echo "   EMBEDDINGS_PROVIDER: $EMBEDDINGS_PROVIDER"
echo ""
echo "💡 Now you can run deployment commands!"

