# Analytics System Documentation

## Overview

Your help center now has comprehensive analytics tracking that monitors user interactions across the entire application. The system tracks:

- **Help Center Page Visits** - Homepage, search, calendar, etc.
- **Search Queries** - What users are searching for and results
- **Chat Interactions** - AI assistant conversations
- **Article Views** - Individual article page visits

## 🔒 Admin-Only Access

**Important**: All analytics dashboards and detailed stats are **admin-only** and require authentication with an admin key.

## Database Tables

### New Analytics Tables Added:

1. **`search_queries`** - Tracks all search queries
   - Query text, filters used, results count
   - IP address and user agent for basic analytics
   - Timestamp

2. **`chat_interactions`** - Tracks chat sessions
   - User messages and AI responses
   - Session IDs for conversation tracking
   - Response times and RAG contexts used
   - Timestamp

3. **`page_visits`** - Tracks page navigation
   - Page paths (/, /search, /calendar, etc.)
   - Page titles and referrer information
   - IP address and user agent
   - Timestamp

4. **`article_views`** - (Enhanced existing table)
   - Individual article page visits
   - Article ID, IP, user agent, timestamp

## API Endpoints

### Public Tracking Endpoints
These endpoints are used by the frontend to track user interactions:

- `POST /api/track-view` - Track article views
- `POST /api/track-search` - Track search queries
- `POST /api/track-chat` - Track chat interactions  
- `POST /api/track-page-visit` - Track page visits

### Admin-Only Analytics Endpoints
**Require `admin-key` header for authentication:**

- `GET /api/search-stats?days=30` - Search analytics
- `GET /api/chat-stats?days=30` - Chat analytics
- `GET /api/page-visit-stats?days=30` - Page visit analytics
- `GET /api/dashboard?days=30` - Comprehensive dashboard
- `GET /api/popular-articles?limit=10` - Most viewed articles

## Frontend Integration

### Automatic Tracking Components

1. **`PageVisitTracker`** - Added to main layout, tracks all page visits
2. **`SearchPageTracker`** - Tracks search queries and results
3. **`ChatTracker`** - Integrated into ChatWidget for conversation tracking
4. **`VisitTracker`** - (Existing) Tracks individual article views

### Manual Tracking Utilities

- **`SearchTracker.trackSearch()`** - Track search queries
- **`ChatTracker.trackUserMessage()`** - Track chat messages
- **`ChatTracker.trackChatComplete()`** - Track full conversations

## Admin Analytics Dashboard

### Accessing the Dashboard

1. **URL**: `/admin/analytics`
2. **Authentication**: Requires admin key
3. **Default Key**: `admin_access_token_2024` (change this!)

### Dashboard Features

- **Overview Cards**: Total counts for all interaction types
- **Time Range Selection**: 7, 30, or 90 days
- **Top Search Queries**: Most popular searches with result counts
- **Popular Chat Questions**: Most common AI assistant queries
- **Top Pages**: Most visited pages in the help center
- **Response Time Analytics**: Chat performance metrics

## Setup Instructions

### 1. Apply Database Migration

```bash
# Run the migration script
python scripts/apply-analytics-migration.py
```

### 2. Set Environment Variables

```bash
# Optional: Set custom admin key (recommended for production)
ADMIN_KEY=your_secure_admin_key_here

# Existing database variables should already be set
DATABASE_URL=postgresql://user:pass@host:port/dbname
```

### 3. Deploy Updated Code

The analytics system is automatically enabled once deployed. No additional configuration needed.

## Security Considerations

### Privacy-Conscious Design
- Only stores IP addresses and user agents for basic analytics
- No personal information or user identification
- Search queries and chat messages are stored for improving service
- All detailed analytics require admin authentication

### Admin Access Control
- Analytics dashboard requires admin key authentication
- Public tracking endpoints have no sensitive data exposure
- Admin key should be rotated regularly
- Consider IP whitelisting for admin access in production

## Usage Examples

### Viewing Analytics Dashboard

1. Visit `/admin/analytics`
2. Enter your admin key
3. Select time range (7, 30, or 90 days)
4. View comprehensive analytics

### Understanding the Data

- **Article Views**: Track content popularity and user engagement
- **Search Queries**: Identify what users are looking for, content gaps
- **Chat Interactions**: Monitor AI assistant usage and common questions
- **Page Visits**: Understand user navigation patterns

### Making Data-Driven Decisions

- **Popular Articles**: Promote or improve high-traffic content
- **Search Trends**: Create content for frequently searched topics
- **Chat Questions**: Identify areas where documentation could be improved
- **Page Flow**: Optimize user experience based on navigation patterns

## API Authentication Example

```javascript
// Frontend admin authentication
const response = await fetch('/api/dashboard?days=30', {
  headers: {
    'admin-key': 'your_admin_key_here'
  }
});
```

## Troubleshooting

### Common Issues

1. **"Admin access required"**: Check your admin key
2. **"Failed to load analytics"**: Verify database connection
3. **No data showing**: Confirm tracking is working and wait for data to accumulate

### Checking Data

```sql
-- Check if tracking is working
SELECT COUNT(*) FROM search_queries WHERE searched_at >= NOW() - INTERVAL '1 day';
SELECT COUNT(*) FROM chat_interactions WHERE created_at >= NOW() - INTERVAL '1 day';
SELECT COUNT(*) FROM page_visits WHERE visited_at >= NOW() - INTERVAL '1 day';
```

## Performance Notes

- Analytics tracking uses fire-and-forget approach (doesn't block user experience)
- Database indexes are optimized for dashboard queries
- Consider data retention policies for long-term storage
- Monitor database size growth if traffic is high

## Future Enhancements

Potential additions to consider:
- User session tracking
- Conversion funnel analysis
- A/B testing capabilities
- Real-time dashboard updates
- CSV/Excel export functionality
- Automated reporting via email

---

**🎉 Your help center now has comprehensive analytics tracking!**

Visit `/admin/analytics` with your admin key to start exploring user behavior and improving your help center experience.
