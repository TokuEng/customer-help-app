# DigitalOcean Deployment Guide

This guide walks you through deploying the Customer Help Center on DigitalOcean.

## Prerequisites

- DigitalOcean account
- GitHub repository with the code
- Notion integration token
- OpenAI API key (for embeddings)
- Domain (help.toku.com) pointed to DigitalOcean

## Setup Steps

### 1. Create Managed PostgreSQL Database

1. Go to DigitalOcean Control Panel > Databases
2. Create a new PostgreSQL cluster:
   - Version: 15
   - Plan: Basic ($15/month for dev)
   - Region: Same as your app (e.g., SFO3)
   - VPC: Create or select existing VPC
3. After creation, enable pgvector:
   ```sql
   CREATE EXTENSION IF NOT EXISTS vector;
   ```
4. Copy the connection string (use the private network URL)

### 2. Deploy Meilisearch

1. Create a new Droplet:
   - Image: Meilisearch from Marketplace
   - Plan: Basic ($6/month minimum)
   - Region: Same as your app
   - VPC: Same VPC as database
2. After creation:
   - SSH into the droplet
   - Note the master key from `/var/opt/meilisearch/data.ms/auth`
   - Configure firewall to only allow App Platform IPs

### 3. Set up Notion Integration

1. Go to https://www.notion.so/my-integrations
2. Create a new integration:
   - Name: Toku Help Center
   - Capabilities: Read content
3. Copy the integration token
4. Share your Notion Knowledge Base with the integration
5. Get the page ID of your index page (from the URL)

### 4. Deploy App Platform

1. Fork/push this repository to GitHub
2. Go to DigitalOcean Control Panel > Apps
3. Create new app from GitHub
4. Review the app-spec.yaml detected
5. Configure environment variables:

```bash
# Database (auto-filled if using DO managed DB)
DATABASE_URL=${db.DATABASE_URL}

# Meilisearch (use private IP)
MEILI_HOST=http://10.x.x.x:7700
MEILI_MASTER_KEY=your-meili-master-key

# Notion
NOTION_TOKEN=secret_xxx
NOTION_INDEX_PAGE_ID=xxx-xxx-xxx

# OpenAI
OPENAI_API_KEY=sk-xxx

# Security
REVALIDATE_TOKEN=generate-secure-token-here

# URLs
WEB_BASE_URL=https://help.toku.com
NEXT_PUBLIC_API_URL=https://help.toku.com/api
```

6. Deploy the app

### 5. Deploy Functions

1. Install DO CLI: `brew install doctl`
2. Authenticate: `doctl auth init`
3. Deploy ingestion function:
```bash
cd functions/ingestion
doctl serverless deploy
```

### 6. Configure Domain

1. In App Platform settings > Domains
2. Add custom domain: help.toku.com
3. Follow DNS configuration instructions
4. SSL certificate will be auto-provisioned

### 7. Initialize Data

1. Run database migrations:
```bash
psql $DATABASE_URL < apps/api/db/schema.sql
```

2. Trigger initial ingestion:
```bash
doctl serverless functions invoke ingestion/sync
```

## Monitoring & Maintenance

### Logs
- App Platform: View in DO console
- Functions: `doctl serverless activations logs`

### Updates
- Code changes: Push to GitHub (auto-deploy)
- Environment variables: Update in App Platform settings
- Database: Use DO backups

### Scaling
- App Platform: Adjust instance count/size
- Database: Upgrade plan as needed
- Meilisearch: Resize droplet

## Cost Breakdown (Estimated)

- App Platform (2x web + 2x api): ~$20/month
- Managed PostgreSQL: $15/month
- Meilisearch Droplet: $6/month
- Functions: ~$5/month (depends on usage)
- **Total: ~$46/month**

## Troubleshooting

### Ingestion not working
- Check function logs: `doctl serverless activations logs`
- Verify Notion permissions
- Check DATABASE_URL connectivity

### Search not returning results
- Verify Meilisearch is accessible
- Check if articles are indexed: `curl $MEILI_HOST/indexes/articles/stats`
- Review API logs in App Platform

### ISR not updating
- Verify REVALIDATE_TOKEN matches between services
- Check Next.js logs for revalidation calls
- Ensure WEB_BASE_URL is correct

## Security Checklist

- [ ] Database uses private networking
- [ ] Meilisearch firewalled to App Platform only
- [ ] All secrets in environment variables
- [ ] REVALIDATE_TOKEN is secure (use `openssl rand -base64 32`)
- [ ] Notion integration has minimal permissions
- [ ] CORS configured appropriately
