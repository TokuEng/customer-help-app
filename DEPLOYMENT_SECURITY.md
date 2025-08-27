# 🔒 Secure Deployment Guide

## ⚠️ Security Issue Fixed

Your deployment was exposing secrets directly in the `app-spec-deploy.yaml` file. This has been fixed to use environment variable references instead.

## 🎯 How It Works Now

### Before (❌ Insecure):
```yaml
- key: NOTION_TOKEN
  type: SECRET
  value: ntn_S31097131812gWkADDpZzrDN7Nv3wyyMLwbSbXKRQcC556  # 🚨 EXPOSED!
```

### After (✅ Secure):
```yaml
- key: NOTION_TOKEN
  type: SECRET
  value: ${NOTION_TOKEN}  # ✅ References environment variable
```

## 🔧 Setting Up Secure Deployment

### Option 1: Using the Deployment Script (Recommended)

1. **Make sure your `apps/api/.env` file has all secrets:**
   ```bash
   MEILI_MASTER_KEY=your_actual_key
   NOTION_TOKEN=your_actual_token
   OPENAI_API_KEY=your_actual_key
   REVALIDATE_TOKEN=your_actual_token
   SPACES_KEY=your_actual_key
   SPACES_SECRET=your_actual_secret
   ```

2. **Install DigitalOcean CLI:**
   ```bash
   brew install doctl
   doctl auth init
   ```

3. **Deploy securely:**
   ```bash
   chmod +x scripts/deploy-to-do.sh
   ./scripts/deploy-to-do.sh
   ```

### Option 2: Manual Setup in DigitalOcean Console

1. **Go to your app in DigitalOcean Console:**
   - Visit: https://cloud.digitalocean.com/apps
   - Click on your app → Settings → Environment Variables

2. **Add these environment variables:**
   ```
   MEILI_MASTER_KEY = your_actual_key
   NOTION_TOKEN = your_actual_token
   OPENAI_API_KEY = your_actual_key
   REVALIDATE_TOKEN = your_actual_token
   SPACES_KEY = your_actual_key
   SPACES_SECRET = your_actual_secret
   ```

3. **Deploy via git push or console**

## 🔐 Security Best Practices

### ✅ Do This:
- Keep secrets in local `.env` files (never commit these)
- Use `${VARIABLE_NAME}` references in deployment specs
- Use the deployment script for automated secure deployment
- Rotate secrets regularly

### ❌ Never Do This:
- Hardcode secrets in YAML files
- Commit `.env` files to git
- Share secrets in chat/email
- Use the same secrets across environments

## 📁 File Security Status

### Safe to Commit:
- ✅ `app-spec-deploy.yaml` (now uses variable references)
- ✅ `scripts/deploy-to-do.sh`
- ✅ All application code

### Never Commit:
- ❌ `apps/api/.env` (contains actual secrets)
- ❌ Any file with actual API keys/tokens

## 🔄 Environment Variable Reference

Your `app-spec-deploy.yaml` now references these environment variables:

| Variable | Purpose | Example Source |
|----------|---------|----------------|
| `MEILI_MASTER_KEY` | MeiliSearch admin access | MeiliSearch console |
| `NOTION_TOKEN` | Notion API access | notion.so/my-integrations |
| `OPENAI_API_KEY` | OpenAI API access | platform.openai.com |
| `REVALIDATE_TOKEN` | Secure revalidation | Generate random string |
| `SPACES_KEY` | DigitalOcean Spaces | cloud.digitalocean.com/account/api/spaces |
| `SPACES_SECRET` | DigitalOcean Spaces | cloud.digitalocean.com/account/api/spaces |

## 🚀 Deployment Commands

```bash
# Check current deployments
doctl apps list

# Deploy with environment variables
./scripts/deploy-to-do.sh

# Check deployment status
doctl apps list

# View app logs
doctl apps logs <app-id> --follow
```

## 🆘 Troubleshooting

### "Missing environment variable" error:
1. Check your local `apps/api/.env` file has the variable
2. Verify the variable name matches exactly
3. Ensure no extra spaces around the `=`

### "Deployment failed" error:
1. Check `doctl auth list` shows you're authenticated
2. Verify your DigitalOcean account has the necessary permissions
3. Check the app spec syntax with `doctl apps spec validate app-spec-deploy.yaml`

### "Secret not found" error in production:
1. Go to DigitalOcean Console → Your App → Settings → Environment Variables
2. Verify all required environment variables are set
3. Redeploy after adding missing variables

## 🔄 Regular Maintenance

- **Rotate secrets every 90 days**
- **Monitor for exposed secrets** in git history
- **Use different secrets** for development/production
- **Review access logs** regularly
