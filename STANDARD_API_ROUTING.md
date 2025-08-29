# Standardized API Routing

## Simplified Routing Structure

All API endpoints now use the same consistent base URL:

### Production Routes
- Base URL: `/backend/api`
- Search: `/backend/api/search`
- Articles: `/backend/api/articles/{slug}`
- Popular Articles: `/backend/api/popular-articles`
- Feedback: `/backend/api/feedback`
- Track View: `/backend/api/track-view`
- Suggestions: `/backend/api/suggestions`
- RAG Search: `/backend/api/rag/search`

### How It Works

1. **DigitalOcean App Platform**:
   - API service is mounted at route `/backend`
   - API internally uses prefix `/api`
   - Combined path: `/backend/api/*`

2. **Client-Side (Browser)**:
   - All requests go to `/backend/api/*`
   - No special cases or different paths

3. **Server-Side (SSR)**:
   - Uses internal service name: `http://api:8080/api/*`
   - Direct service-to-service communication

## Environment Variable

The `NEXT_PUBLIC_API_URL` in `.do/app.yaml` is already correctly set to:
```
${APP_URL}/backend/api
```

This ensures all endpoints use the same routing pattern.

## Benefits

- ✅ Consistent routing for all endpoints
- ✅ Easier to debug and maintain
- ✅ No special cases or exceptions
- ✅ Clear and predictable URL structure
