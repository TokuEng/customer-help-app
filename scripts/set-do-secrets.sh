#!/bin/bash

# Script to set Digital Ocean App Platform secrets
# This prevents secrets from being overwritten during deployment

set -e

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}Digital Ocean App Secrets Setup${NC}"
echo "=================================="

# Check if doctl is installed
if ! command -v doctl &> /dev/null; then
    echo -e "${RED}Error: doctl CLI not found${NC}"
    echo "Please install doctl: https://docs.digitalocean.com/reference/doctl/how-to/install/"
    exit 1
fi

# Get app ID
APP_NAME="customer-help-center"
APP_ID=$(doctl apps list --format ID,Spec.Name --no-header | grep "$APP_NAME" | awk '{print $1}' || true)

if [ -z "$APP_ID" ]; then
    echo -e "${RED}Error: App '$APP_NAME' not found${NC}"
    echo "Please deploy the app first using GitHub Actions"
    exit 1
fi

echo -e "${GREEN}Found app:${NC} $APP_NAME (ID: $APP_ID)"
echo

# Function to set a secret
set_secret() {
    local key=$1
    local prompt=$2
    local example=$3
    
    echo -e "${YELLOW}Setting secret: $key${NC}"
    if [ -n "$example" ]; then
        echo "Example: $example"
    fi
    
    # Read secret value (hidden input)
    read -s -p "Enter value for $key: " value
    echo
    
    if [ -z "$value" ]; then
        echo -e "${RED}Skipping $key (no value provided)${NC}"
        return
    fi
    
    # Update the app with the secret
    doctl apps update $APP_ID --env "$key=$value" >/dev/null 2>&1
    echo -e "${GREEN}✓ $key set successfully${NC}"
    echo
}

# Secrets for the web service
echo -e "${YELLOW}=== Web Service Secrets ===${NC}"
set_secret "OPENAI_API_KEY" "Your OpenAI API key" "sk-proj-..."
set_secret "REVALIDATE_TOKEN" "Secure token for revalidation" "any-secure-random-string"

# Secrets for the API service
echo -e "${YELLOW}=== API Service Secrets ===${NC}"
set_secret "MEILI_HOST" "MeiliSearch host URL" "https://your-meili-instance.com"
set_secret "MEILI_MASTER_KEY" "MeiliSearch master key" "your-master-key"
set_secret "NOTION_TOKEN" "Notion integration token" "secret_..."
set_secret "NOTION_INDEX_PAGE_ID" "Notion index page ID" "page-id-from-notion"
set_secret "SPACES_KEY" "Digital Ocean Spaces access key" "DO..."
set_secret "SPACES_SECRET" "Digital Ocean Spaces secret key" "your-secret-key"
set_secret "SPACES_BUCKET" "Digital Ocean Spaces bucket name" "your-bucket-name"
set_secret "SPACES_CDN_ENDPOINT" "Spaces CDN endpoint" "https://your-bucket.sfo3.cdn.digitaloceanspaces.com"

echo -e "${GREEN}Secret configuration complete!${NC}"
echo
echo "Note: The app will restart automatically to apply the new secrets."
echo "Check deployment status at: https://cloud.digitalocean.com/apps/$APP_ID"

