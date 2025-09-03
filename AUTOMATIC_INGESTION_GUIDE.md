# Automatic Ingestion Setup Guide

This guide explains how to set up automatic ingestion of Notion content for your Customer Help Center.

## Overview

The automatic ingestion system monitors your Notion workspace for changes and automatically syncs updated content to your help center. It includes:

1. **Scheduled Ingestion**: Runs every 15 minutes to check for updates
2. **API Endpoints**: Manual triggers and webhook support
3. **Monitoring**: Health checks and status monitoring
4. **Smart Updates**: Only processes changed content to save resources

## Architecture

```
Notion Workspace
      ↓
[Scheduled Job / API Trigger]
      ↓
Ingestion Handler
      ↓
[PostgreSQL + Meilisearch]
      ↓
Help Center App
```

## Setup Options

### Option 1: DigitalOcean App Platform with Scheduled Worker (Recommended)

1. **Deploy with the scheduled ingestion spec:**
   ```bash
   doctl apps create --spec app-spec-with-scheduled-ingestion.yaml
   ```

2. **The worker will automatically:**
   - Run ingestion every 15 minutes
   - Check for changed content only
   - Store images permanently in Spaces
   - Trigger page revalidation

### Option 2: External Cron Job

1. **Set up a cron job on any server:**
   ```bash
   # Edit crontab
   crontab -e
   
   # Add this line (runs every 15 minutes)
   */15 * * * * /path/to/python /path/to/scripts/scheduled-ingestion.py >> /var/log/ingestion.log 2>&1
   ```

2. **Configure environment variables:**
   ```bash
   export DO_DATABASE_URL="postgresql://..."
   export API_URL="https://your-app.ondigitalocean.app"
   export REVALIDATE_TOKEN="your-token"
   ```

### Option 3: API-Based Triggers

Use the API endpoints for more control:

1. **Trigger ingestion manually:**
   ```bash
   curl -X POST https://your-app.ondigitalocean.app/api/ingestion/trigger \
     -H "Authorization: Bearer YOUR_REVALIDATE_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"force_full_sync": false}'
   ```

2. **Check status:**
   ```bash
   curl https://your-app.ondigitalocean.app/api/ingestion/status \
     -H "Authorization: Bearer YOUR_REVALIDATE_TOKEN"
   ```

3. **Webhook for specific pages:**
   ```bash
   curl -X POST https://your-app.ondigitalocean.app/api/ingestion/webhook \
     -H "Authorization: Bearer YOUR_REVALIDATE_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{
       "event": "page_updated",
       "page_id": "notion-page-id-here"
     }'
   ```

## API Endpoints

### POST /api/ingestion/trigger
Manually trigger the ingestion process.

**Request Body:**
```json
{
  "force_full_sync": false,  // Skip timestamp check
  "page_ids": ["page-id-1", "page-id-2"]  // Optional: specific pages only
}
```

**Response:**
```json
{
  "status": "started",
  "message": "Ingestion process started in background",
  "force_full_sync": false,
  "page_ids": null
}
```

### GET /api/ingestion/status
Check the current ingestion status.

**Response:**
```json
{
  "status": "idle",
  "last_synced": "2024-01-15T10:30:00Z",
  "is_running": false,
  "message": "Ingestion is idle"
}
```

### POST /api/ingestion/webhook
Webhook endpoint for external services.

**Request Body:**
```json
{
  "event": "page_updated",  // or "full_sync", "incremental_sync"
  "page_id": "notion-page-id",  // Optional
  "timestamp": "2024-01-15T10:30:00Z"  // Optional
}
```

## Monitoring

### Admin Dashboard

Access the comprehensive admin dashboard at `/admin` which includes:

1. **Dashboard Overview** (`/admin`)
   - Real-time status of all systems
   - Quick stats and metrics
   - Recent activity summary
   - Quick action buttons

2. **Ingestion Monitor** (`/admin/ingestion`)
   - Live ingestion status
   - Sync history with detailed logs
   - Manual sync triggers
   - Performance metrics

3. **Work Submissions** (`/admin/work-submissions`)
   - View and manage user requests
   - Filter by status and priority
   - Track completion rates

4. **Analytics** (`/admin/analytics`)
   - Article view statistics
   - Search query insights
   - Usage trends over time
   - Popular content tracking

### Using the Monitor Script

1. **One-time check:**
   ```bash
   python scripts/monitor-auto-ingestion.py
   ```

2. **Continuous monitoring:**
   ```bash
   python scripts/monitor-auto-ingestion.py --watch --interval 60
   ```

### What to Monitor

- **Last Sync Time**: Should be within the last hour
- **API Status**: Should be reachable
- **Article Count**: Should match your Notion workspace
- **Recent Updates**: Shows sync is working
- **Ingestion Logs**: Check `/admin/ingestion` for detailed history

### Alerts

The monitor will show:
- ✅ **Healthy**: Everything working normally
- ⚠️ **Warning**: Minor issues (e.g., sync delayed)
- ❌ **Error**: Critical issues need attention

## Troubleshooting

### Ingestion Not Running

1. **Check worker logs:**
   ```bash
   doctl apps logs YOUR_APP_ID --type=worker --component=ingestion-scheduler
   ```

2. **Verify environment variables:**
   ```bash
   python scripts/test-notion-connection.py
   ```

3. **Check API endpoint:**
   ```bash
   curl https://your-app.ondigitalocean.app/api/ingestion/status \
     -H "Authorization: Bearer YOUR_TOKEN"
   ```

### Duplicate Ingestion Runs

The system prevents duplicates by:
- Checking if ingestion is already running
- Using API triggers instead of direct execution
- Maintaining a global state flag

### Missing Updates

If content isn't updating:

1. **Force a full sync:**
   ```bash
   curl -X POST https://your-app.ondigitalocean.app/api/ingestion/trigger \
     -H "Authorization: Bearer YOUR_TOKEN" \
     -d '{"force_full_sync": true}'
   ```

2. **Check specific page:**
   ```bash
   curl -X POST https://your-app.ondigitalocean.app/api/ingestion/trigger \
     -H "Authorization: Bearer YOUR_TOKEN" \
     -d '{"page_ids": ["your-page-id"]}'
   ```

## Performance Tuning

### Adjust Parallelism
In your environment variables:
```bash
INGESTION_PARALLEL=10  # Process 10 pages concurrently
```

### Change Schedule Frequency
Edit the cron expression in the worker:
```bash
*/5 * * * *   # Every 5 minutes (more frequent)
*/30 * * * *  # Every 30 minutes (less frequent)
0 * * * *     # Every hour
```

## Security

1. **Protect the token**: Keep `REVALIDATE_TOKEN` secret
2. **Use HTTPS**: Always use HTTPS for API calls
3. **Restrict access**: Consider IP whitelisting for webhooks
4. **Rotate tokens**: Change tokens periodically

## Testing

### Local Testing
```bash
# Test with local database
python scripts/scheduled-ingestion.py

# Test with production database
DO_DATABASE_URL="postgresql://..." python scripts/scheduled-ingestion.py
```

### API Testing
```bash
# Test trigger endpoint
python scripts/test-ingestion-api.py

# Monitor in real-time
python scripts/monitor-auto-ingestion.py --watch
```

## Best Practices

1. **Monitor regularly**: Check health at least daily
2. **Log retention**: Keep logs for debugging
3. **Backup strategy**: Regular database backups
4. **Update notifications**: Alert team of sync issues
5. **Rate limiting**: Respect Notion API limits

## Integration with CI/CD

Add to your deployment pipeline:

```yaml
# .github/workflows/deploy.yml
- name: Trigger Full Sync
  run: |
    curl -X POST ${{ secrets.APP_URL }}/api/ingestion/trigger \
      -H "Authorization: Bearer ${{ secrets.REVALIDATE_TOKEN }}" \
      -d '{"force_full_sync": true}'
```

## Costs

Estimated monthly costs for automatic ingestion:
- Worker (basic-xs): ~$5/month
- Additional database queries: Minimal
- Bandwidth: Minimal

Total additional cost: ~$5-10/month
