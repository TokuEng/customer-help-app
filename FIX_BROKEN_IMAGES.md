# 🚨 Fix Broken Images in Production

## Problem
Images are returning HTTP 403 (Forbidden) because the DigitalOcean Spaces bucket needs proper public access configuration.

## Solution - Manual Steps in DigitalOcean Console

### 1. Set Bucket Permissions

1. Go to [DigitalOcean Spaces](https://cloud.digitalocean.com/spaces)
2. Click on your bucket: `customer-help-app-notion-images`
3. Go to **Settings** tab
4. Scroll to **File Listing** section
5. Change from "Private" to **"Public"**
6. Click **Save**

### 2. Add CORS Configuration (if not already set)

Still in the Settings tab:
1. Find **CORS Configurations** section
2. Click **Add CORS Configuration**
3. Add these settings:
   - Origin: `*`
   - Allowed Headers: `*`
   - Allowed Methods: `GET, HEAD`
4. Click **Save Options**

### 3. Clear Caches

After making these changes:
1. Clear your browser cache
2. If using CDN, wait 5-10 minutes for propagation
3. Hard refresh the production site (Ctrl+Shift+R or Cmd+Shift+R)

## Verification

Test this image URL in your browser:
```
https://customer-help-app-notion-images.sfo3.digitaloceanspaces.com/notion-images/2590b95a-751d-8051-9182-eb3aceab82be/2590b95a-751d-8021-8d08-d6f87ed326dd_67d35313.png
```

If you see the image, the fix worked!

## Root Cause
- The bucket was created with private access
- Individual file ACLs were set to public-read, but the bucket policy overrides this
- The API doesn't have permission to modify bucket policies (only the account owner can)

## Prevention
When creating new Spaces buckets for public content, always:
1. Set File Listing to "Public" during creation
2. Configure CORS immediately
3. Test with a sample file before deploying

