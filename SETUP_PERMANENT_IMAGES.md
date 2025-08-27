# Permanent Image Storage Setup Guide

This guide helps you set up permanent image storage for your Notion-based help center using DigitalOcean Spaces.

## Problem Solved

Notion provides temporary image URLs that expire after ~1 hour. This setup downloads images during ingestion and stores them permanently in DigitalOcean Spaces, eliminating broken images.

## Prerequisites

- DigitalOcean account
- Existing customer help center app deployed on DigitalOcean

## Step 1: Create DigitalOcean Spaces

1. Go to [DigitalOcean Spaces](https://cloud.digitalocean.com/spaces)
2. Click **"Create a Space"**
3. Choose settings:
   - **Region**: `sfo3` (San Francisco) - recommended for US users
   - **Name**: Something like `customer-help-images` (must be globally unique)
   - **File Listing**: Private (recommended)
   - **CDN**: Enable for faster loading (optional but recommended)

## Step 2: Create API Keys

1. Go to [DigitalOcean API](https://cloud.digitalocean.com/account/api/spaces)
2. Click **"Generate New Key"**
3. Choose **"Spaces Keys"**
4. Give it a name like "Customer Help Images"
5. Save the **Key** and **Secret** (you won't see the secret again)

## Step 3: Configure Environment Variables

### For Local Development

Add to your `apps/api/.env` file:

```bash
# DigitalOcean Spaces Configuration
SPACES_KEY=your_spaces_key_here
SPACES_SECRET=your_spaces_secret_here
SPACES_BUCKET=customer-help-images
SPACES_REGION=sfo3
SPACES_CDN_ENDPOINT=https://customer-help-images.sfo3.cdn.digitaloceanspaces.com
```

### For Production (DigitalOcean App Platform)

Update your `app-spec-deploy.yaml`:

```yaml
- key: SPACES_KEY
  type: SECRET
  value: your_spaces_key_here
- key: SPACES_SECRET
  type: SECRET
  value: your_spaces_secret_here
- key: SPACES_BUCKET
  value: customer-help-images
- key: SPACES_REGION
  value: sfo3
- key: SPACES_CDN_ENDPOINT
  value: https://customer-help-images.sfo3.cdn.digitaloceanspaces.com
```

## Step 4: Test Spaces Setup

Run the setup script to verify everything works:

```bash
python scripts/setup-do-spaces.py
```

This will:
- ✅ Test connection to your Spaces bucket
- ✅ Set CORS policy for web access
- ✅ Upload and delete a test file
- ✅ Verify permissions

## Step 5: Deploy Updated Code

1. **Commit your changes:**
   ```bash
   git add .
   git commit -m "Add permanent image storage with DigitalOcean Spaces"
   git push
   ```

2. **Deploy to DigitalOcean:**
   Your app will automatically redeploy with the new image storage functionality.

## Step 6: Re-run Ingestion

After deployment, re-run the ingestion to process images:

```bash
DO_DATABASE_URL='your_database_url' python scripts/run-ingestion-do.py
```

You should see messages like:
```
✅ Stored image: https://notion-url -> https://your-bucket.sfo3.cdn.digitaloceanspaces.com/notion-images/...
```

## How It Works

1. **During ingestion**, when the system encounters a Notion image:
   - Downloads the image from Notion's temporary URL
   - Uploads it to your DigitalOcean Spaces bucket
   - Replaces the temporary URL with the permanent CDN URL
   - Stores the article with permanent image URLs

2. **In production**, users see:
   - Fast-loading images from CDN
   - No broken images
   - Consistent image availability

## Monitoring

- **Spaces Usage**: Check [DigitalOcean Spaces console](https://cloud.digitalocean.com/spaces) for storage usage
- **CDN Traffic**: Monitor CDN usage for bandwidth optimization
- **Costs**: DigitalOcean Spaces costs ~$5/month for 250GB + $0.01/GB transfer

## Troubleshooting

### Images Still Breaking
- Check environment variables are set correctly
- Verify Spaces API keys have correct permissions
- Check ingestion logs for error messages

### Upload Failures
- Verify bucket name is correct and accessible
- Check API key permissions
- Ensure bucket region matches `SPACES_REGION`

### Slow Loading
- Enable CDN on your Spaces bucket
- Set `SPACES_CDN_ENDPOINT` to the CDN URL

## Cost Optimization

- **Storage**: ~$5/month for 250GB
- **Transfer**: $0.01/GB (usually minimal for images)
- **CDN**: Included in Spaces pricing

For a typical help center with 100-200 articles and images, expect ~$5-10/month total.

## Backup Strategy

DigitalOcean Spaces provides:
- 99.9% availability SLA
- Geographic replication
- Version control (optional)

Consider enabling versioning for critical images.
