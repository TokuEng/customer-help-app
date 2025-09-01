# Chatbot Fix Documentation

## Issue
The chatbot was saying "I don't have information" for questions about topics that actually exist in the database, even though:
1. The database contains many articles (e.g., 20 articles about payroll)
2. The RAG search API returns good results with content
3. The frontend was overly strict in filtering "relevant" results

## Root Causes

1. **Overly Strict Relevance Filtering**: The chat route had complex relevance checking that was rejecting valid RAG results
2. **Wrong Suggested Questions**: The chatbot showed calendar-only questions instead of diverse topics
3. **Potential Backend URL Issues**: In production, the chat endpoint might not be reaching the backend API correctly

## Fixes Applied

### 1. Trust RAG Search Results (Primary Fix)
- Removed the complex relevance filtering that was second-guessing RAG results
- Now only filters out completely empty contexts
- RAG search already does relevance scoring, so we trust its results

### 2. Updated Suggested Questions
Changed from calendar-only questions to match actual articles:
- "How to review and approve expenses?"
- "How to enable Token Payroll?"
- "How to submit an automated invoice?"
- "How to approve time off requests?"
- "What are Toku supplemental benefits?"
- "When is the next payment date?"

### 3. Fixed Backend URL Configuration
- Updated to use consistent URL resolution like other API calls
- Properly handles internal service communication in Docker/DigitalOcean deployments
- Falls back to `http://api:8080` for server-side calls

## Testing

To verify the fix works:
1. Ask any of the suggested questions
2. The chatbot should find and display relevant articles
3. Check that it includes proper citations [1], [2], etc.
4. Verify links to articles work (e.g., /a/article-slug)

## Environment Variables

Make sure these are set in production:
- `BACKEND_URL` (optional, will fallback to internal service communication)
- `OPENAI_API_KEY` (required for chat functionality)

## Database Content

The database contains articles in these categories:
- **Library**: 28 articles (expenses, invoices, time off, etc.)
- **Token Payroll**: 15 articles (enabling token payroll, advantages, etc.)
- **Policy**: 3 articles (overpayment policy, invoice approval, etc.)
- **Benefits**: 1 article (supplemental benefits)

Total: 47 articles covering various topics like payroll, expenses, benefits, leave, invoices, and more.
