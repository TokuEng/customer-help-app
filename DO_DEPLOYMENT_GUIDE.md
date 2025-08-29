# 🚀 DigitalOcean App Platform Deployment Guide

This guide explains how to deploy a full-stack application to DigitalOcean App Platform using both Docker Container Registry and GitHub source approaches. Use this as a template for deploying other applications.

## 📋 Table of Contents

1. [Prerequisites](#prerequisites)
2. [Project Structure](#project-structure)
3. [Environment Configuration](#environment-configuration)
4. [Deployment Approaches](#deployment-approaches)
5. [Deployment Scripts](#deployment-scripts)
6. [Step-by-Step Deployment](#step-by-step-deployment)
7. [Post-Deployment](#post-deployment)
8. [Troubleshooting](#troubleshooting)
9. [Template Adaptation](#template-adaptation)

## 🔧 Prerequisites

### Required Tools
```bash
# Install DigitalOcean CLI
brew install doctl

# Install Docker (for container deployments)
brew install docker

# Authenticate with DigitalOcean
doctl auth init
```

### DigitalOcean Setup
1. **Container Registry** (for Docker approach):
   ```bash
   # Create container registry
   doctl registry create your-registry-name
   
   # Login to registry
   doctl registry login
   ```

2. **Database** (if needed):
   - Create PostgreSQL database in DO console
   - Note the connection details

3. **Spaces** (for file storage):
   - Create Spaces bucket for static assets
   - Generate API keys for Spaces access

## 🏗️ Project Structure

This deployment setup supports monorepo applications with separate frontend and backend:

```
your-app/
├── .do/
│   └── app.yaml                 # Docker-based deployment config
├── apps/
│   ├── web/                     # Frontend (Next.js/React)
│   │   ├── Dockerfile
│   │   ├── package.json
│   │   └── env.template
│   └── api/                     # Backend (FastAPI/Node.js)
│       ├── Dockerfile
│       ├── requirements.txt     # Python deps
│       └── env.template
├── scripts/
│   ├── build-and-push.sh        # Build & push Docker images
│   ├── deploy-to-do.sh          # GitHub source deployment
│   └── deploy-full.sh           # Complete Docker deployment
├── app-spec-deploy.yaml         # GitHub source deployment config
└── DO_DEPLOYMENT_GUIDE.md       # This guide
```

## 🔒 Environment Configuration

### 1. Create Environment Files

Copy the template files and fill in your secrets:

```bash
# Backend environment
cp apps/api/env.template apps/api/.env

# Frontend environment (if needed)
cp apps/web/env.template apps/web/.env
```

### 2. Required Environment Variables

**Core Application:**
- `DATABASE_URL` - PostgreSQL connection string
- `REVALIDATE_TOKEN` - Security token for cache revalidation

**Third-party Services:**
- `OPENAI_API_KEY` - For embeddings/AI features
- `NOTION_TOKEN` - If using Notion as CMS
- `NOTION_INDEX_PAGE_ID` - Notion page ID for content

**Search (Meilisearch):**
- `MEILI_HOST` - Meilisearch server URL
- `MEILI_MASTER_KEY` - Meilisearch admin key

**File Storage (DO Spaces):**
- `SPACES_KEY` - DigitalOcean Spaces access key
- `SPACES_SECRET` - DigitalOcean Spaces secret key
- `SPACES_BUCKET` - Bucket name for file storage
- `SPACES_REGION` - Spaces region (e.g., sfo3)
- `SPACES_CDN_ENDPOINT` - CDN URL for faster asset loading

## 🐳 Deployment Approaches

### Option 1: Docker Container Registry (Recommended)

**Pros:**
- Faster deployments (pre-built images)
- Consistent environments
- Better control over build process
- Supports complex build requirements

**Configuration:** `.do/app.yaml`

```yaml
name: your-app-name
region: sfo3

services:
  - name: web
    image:
      registry_type: DOCR
      registry: your-registry-name
      repository: your-app-web
      tag: latest
    http_port: 3000
    instance_count: 1
    instance_size_slug: basic-xs
    envs:
      - key: NODE_ENV
        value: production
      - key: NEXT_PUBLIC_API_URL
        value: ${APP_URL}/api
    routes:
      - path: /

  - name: api
    image:
      registry_type: DOCR
      registry: your-registry-name
      repository: your-app-api
      tag: latest
    http_port: 8080
    instance_count: 1
    instance_size_slug: basic-xs
    envs:
      - key: DATABASE_URL
        value: ${your-db.DATABASE_URL}
    routes:
      - path: /api

databases:
  - cluster_name: your-db
    db_name: defaultdb
    db_user: doadmin
    engine: PG
    name: your-db
    production: true
    version: "17"
```

### Option 2: GitHub Source Deployment

**Pros:**
- Automatic deployments on push
- No manual image building
- Simpler for small apps

**Configuration:** `app-spec-deploy.yaml`

```yaml
name: your-app-name
region: sfo3

services:
  - name: web
    github:
      repo: your-org/your-repo
      branch: main
      deploy_on_push: true
    source_dir: /apps/web
    build_command: npm install && npm run build
    run_command: npm start
    http_port: 3000

  - name: api
    github:
      repo: your-org/your-repo
      branch: main
      deploy_on_push: true
    source_dir: /apps/api
    dockerfile_path: /apps/api/Dockerfile
    http_port: 8080
```

## 📜 Deployment Scripts

### `build-and-push.sh` - Docker Image Builder

Builds and pushes Docker images to DO Container Registry:

```bash
#!/bin/bash
echo "🐳 Building and pushing Docker images to DigitalOcean Container Registry"

# Login to registry
doctl registry login --expiry-seconds 600

# Build and push Web image
docker buildx build --platform linux/amd64 \
  -t registry.digitalocean.com/your-registry/your-app-web:latest \
  -f apps/web/Dockerfile apps/web --push

# Build and push API image  
docker buildx build --platform linux/amd64 \
  -t registry.digitalocean.com/your-registry/your-app-api:latest \
  -f apps/api/Dockerfile apps/api --push
```

### `deploy-to-do.sh` - GitHub Source Deployer

Deploys using GitHub source with environment validation:

```bash
#!/bin/bash
set -e

# Load environment variables
source apps/api/.env

# Check required variables
REQUIRED_VARS=("API_KEY" "DATABASE_URL" "SECRET_TOKEN")
for var in "${REQUIRED_VARS[@]}"; do
    if [ -z "${!var}" ]; then
        echo "❌ Missing required variable: $var"
        exit 1
    fi
done

# Deploy or update app
if doctl apps list | grep -q "your-app-name"; then
    APP_ID=$(doctl apps list --format ID,Spec.Name --no-header | grep "your-app-name" | awk '{print $1}')
    doctl apps update "$APP_ID" --spec app-spec-deploy.yaml
else
    doctl apps create --spec app-spec-deploy.yaml
fi
```

### `deploy-full.sh` - Complete Docker Deployment

Combines building, pushing, and deploying in one script:

```bash
#!/bin/bash
set -e

# Environment validation
REQUIRED_VARS=("API_KEY" "SECRET_TOKEN")
# ... validation logic ...

# Build and push images
./scripts/build-and-push.sh

# Update app with new images
APP_ID="your-app-id"
doctl apps update $APP_ID --spec .do/app.yaml
```

## 🎯 Step-by-Step Deployment

### Initial Setup (First Time Only)

1. **Create DigitalOcean Resources:**
   ```bash
   # Create container registry
   doctl registry create your-registry-name
   
   # Create database (or use DO console)
   doctl databases create your-db --engine postgresql --region sfo3
   ```

2. **Configure Environment:**
   ```bash
   # Copy and configure environment files
   cp apps/api/env.template apps/api/.env
   # Edit apps/api/.env with your actual values
   ```

3. **Update Configuration Files:**
   - Edit `.do/app.yaml` with your app name and registry
   - Update `app-spec-deploy.yaml` with your GitHub repo
   - Modify scripts with your specific values

### Deployment Methods

#### Method 1: Docker Container Registry

```bash
# 1. Build and push images
./scripts/build-and-push.sh

# 2. Deploy to DigitalOcean
doctl apps create --spec .do/app.yaml

# 3. Get app ID for future updates
doctl apps list
```

#### Method 2: GitHub Source

```bash
# 1. Deploy from source
./scripts/deploy-to-do.sh

# 2. Enable auto-deployment
# (Configured in app-spec-deploy.yaml with deploy_on_push: true)
```

#### Method 3: Complete Deployment

```bash
# Load environment variables first
source apps/api/.env

# Run complete deployment
./scripts/deploy-full.sh
```

### Updates

```bash
# For Docker deployments
./scripts/build-and-push.sh
doctl apps update YOUR_APP_ID --spec .do/app.yaml

# For GitHub source deployments
git push origin main  # Auto-deploys if configured
```

## 🔧 Post-Deployment

### 1. Get Application URL
```bash
doctl apps get YOUR_APP_ID --format URL
```

### 2. Check Deployment Status
```bash
doctl apps get YOUR_APP_ID
doctl apps logs YOUR_APP_ID --type build
doctl apps logs YOUR_APP_ID --type run
```

### 3. Set Up Custom Domain (Optional)
```bash
# Add domain in DO console or via CLI
doctl apps domains create YOUR_APP_ID --domain yourdomain.com
```

### 4. Configure SSL Certificate
SSL certificates are automatically provisioned for custom domains.

## 🔍 Troubleshooting

### Common Issues

**Build Failures:**
```bash
# Check build logs
doctl apps logs YOUR_APP_ID --type build --follow

# Common fixes:
# - Check Dockerfile syntax
# - Verify package.json dependencies
# - Ensure environment variables are set
```

**Registry Login Issues:**
```bash
# Re-authenticate
doctl auth init
doctl registry login --expiry-seconds 3600
```

**Environment Variable Issues:**
```bash
# Verify variables are set
doctl apps get YOUR_APP_ID --format Spec.Services[0].Envs

# Update environment variables
doctl apps update YOUR_APP_ID --spec .do/app.yaml
```

**Database Connection Issues:**
```bash
# Check database status
doctl databases list
doctl databases get YOUR_DB_ID

# Verify connection string format:
# postgres://username:password@host:port/database?sslmode=require
```

### Debugging Commands

```bash
# List all apps
doctl apps list

# Get detailed app info
doctl apps get YOUR_APP_ID

# Stream logs
doctl apps logs YOUR_APP_ID --follow

# Check deployments
doctl apps list-deployments YOUR_APP_ID
```

## 🎨 Template Adaptation

To adapt this deployment setup for a new application:

### 1. Update Configuration Files

**`.do/app.yaml`:**
- Change `name` to your app name
- Update `registry` and `repository` names
- Modify environment variables for your app
- Adjust `http_port` if different
- Update database configuration

**`app-spec-deploy.yaml`:**
- Update GitHub repository information
- Modify build and run commands
- Adjust source directories
- Update environment variables

### 2. Customize Scripts

**`build-and-push.sh`:**
- Update registry URLs
- Modify Docker image names
- Adjust build contexts if needed

**`deploy-to-do.sh` / `deploy-full.sh`:**
- Update required environment variables list
- Change app name references
- Modify any app-specific validation

### 3. Environment Variables

**Create new `env.template` files:**
```bash
# For your specific app needs
cp apps/api/env.template apps/api/env.template.new
# Edit with your app's required variables
```

### 4. Dockerfile Optimization

**Frontend (Next.js example):**
- Multi-stage build for smaller images
- Proper user permissions
- Cache optimization

**Backend (FastAPI example):**
- Minimal base image
- System dependencies
- Security best practices

### 5. App-Specific Adjustments

- **Port Configuration**: Ensure your apps use the correct ports
- **Health Checks**: Add health check endpoints
- **Resource Sizing**: Adjust instance sizes based on requirements
- **Environment-Specific**: Add staging/production configurations

## 📚 Additional Resources

- [DigitalOcean App Platform Documentation](https://docs.digitalocean.com/products/app-platform/)
- [doctl CLI Reference](https://docs.digitalocean.com/reference/doctl/)
- [App Spec Reference](https://docs.digitalocean.com/products/app-platform/reference/app-spec/)
- [Container Registry Guide](https://docs.digitalocean.com/products/container-registry/)

## 🤝 Support

For app-specific issues:
1. Check deployment logs with `doctl apps logs`
2. Verify environment variable configuration
3. Test Docker builds locally before pushing
4. Review DigitalOcean App Platform status page

---

**Happy Deploying! 🚀**

*This guide was generated for the customer help center app and can be adapted for any full-stack application deployment to DigitalOcean App Platform.*
