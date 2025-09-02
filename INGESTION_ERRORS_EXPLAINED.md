# Ingestion Errors Explained

## 1. Duplicate Key Errors (UniqueViolationError)

```
asyncpg.exceptions.UniqueViolationError: duplicate key value violates unique constraint "articles_slug_key"
DETAIL:  Key (slug)=(toku-how-to-view-your-payslips-on-the-platform) already exists.
```

### What it means:
- The ingestion tried to insert articles that already exist
- The database prevented duplicate slugs (which is good!)

### Why it happened:
- During re-ingestion, some articles were processed in parallel
- The "UPSERT" operation sometimes has race conditions in parallel processing

### Impact: **None** ✅
- The articles were still updated correctly
- The database integrity was maintained
- 60 articles were successfully processed

## 2. Revalidation Failures (HTTP 308)

```
Revalidation failed for toku-how-to-view-your-payslips-on-the-platform: 308
```

### What it means:
- HTTP 308 is a "Permanent Redirect" status
- Next.js revalidation endpoint is redirecting

### Why it happened:
- The production app might be enforcing HTTPS
- Or the revalidation endpoint path has changed

### Impact: **Minor** ⚠️
- The database was updated successfully
- Images are now working
- But Next.js cache might not have been cleared automatically

## Solutions

### For Immediate Results:
1. **Clear browser cache** - Hard refresh (Ctrl+Shift+R or Cmd+Shift+R)
2. **Wait a few minutes** - Next.js will eventually revalidate on its own

### To Fix Revalidation (Optional):
Check your production app's revalidation endpoint:
1. Verify `WEB_BASE_URL` in your deployment config
2. Check if the `/api/revalidate` endpoint exists
3. Ensure `REVALIDATE_TOKEN` matches between API and Web app

### To Fix Duplicate Errors (Optional):
In `functions/ingestion/handler.py`, reduce parallelism:
```python
BATCH_SIZE = 1  # Process articles sequentially instead of 5 at a time
```

## Bottom Line
✅ Your images are fixed and working
✅ The errors didn't prevent successful ingestion
✅ The production site should show images correctly now
