# API Routing Debug Guide

## Current Setup

1. **API Service Route**: `/backend` (in app.yaml)
2. **API Internal Prefix**: `/api` (in settings.py)
3. **Full API Path**: `/backend/api/*`

## Environment Variable
- `NEXT_PUBLIC_API_URL`: `${APP_URL}/backend/api`

## How it Should Work

All API endpoints should be accessed at:
- Search: `/backend/api/search`
- Articles: `/backend/api/articles/{slug}`
- Popular Articles: `/backend/api/popular-articles`

## Quick Test Commands

Test from your local machine:

```bash
# Test popular articles (working)
curl https://your-app-url.ondigitalocean.app/backend/api/popular-articles?limit=5

# Test search (not working?)
curl -X POST https://your-app-url.ondigitalocean.app/backend/api/search \
  -H "Content-Type: application/json" \
  -d '{"q":"test","top_k":5}'

# Test article fetch
curl https://your-app-url.ondigitalocean.app/backend/api/articles/your-article-slug
```

## Check Browser Console

In your browser console on the production site, run:

```javascript
// Check what API URL is being used
console.log(process.env.NEXT_PUBLIC_API_URL);

// Check the actual fetch URLs being constructed
// Look for the console.log outputs from api.ts
```

## Possible Issues

1. **Environment Variable Not Set**: The `NEXT_PUBLIC_API_URL` might not be properly set in production
2. **Build Time vs Runtime**: Next.js bakes in `NEXT_PUBLIC_*` variables at build time
3. **Caching**: Browser might be caching old API routes

## Solution Options

### Option 1: Force Rebuild
The app needs to be rebuilt to pick up new environment variables:
```bash
doctl apps update YOUR_APP_ID --spec .do/app.yaml --force-rebuild
```

### Option 2: Hardcode API URL (Temporary)
Change in `apps/web/lib/api.ts`:
```typescript
function getApiBaseUrl() {
  // Temporary hardcode for debugging
  return 'https://your-app-url.ondigitalocean.app/backend/api';
}
```

### Option 3: Add API Route Rewrite
Add a rewrite rule in Next.js config to handle both patterns.

## Root Cause
The issue is likely that the web app was built when `NEXT_PUBLIC_API_URL` wasn't set properly, so it's falling back to the hardcoded `/backend/api` value, but there might be some client-side routing issue we're not seeing.
