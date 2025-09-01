# Work Submission Feature

This document describes the new Work Submission feature that has been added to the Customer Help Center.

## Overview

The Work Submission feature allows users to submit work requests through a user-friendly form. These requests are saved to a PostgreSQL database and can be tracked and managed by administrators.

## Features

- **Submit Work Requests**: Users can submit requests with details like title, description, priority, and contact information
- **Priority Levels**: Support for Low, Medium, High, and Urgent priorities
- **Status Tracking**: Requests can be tracked through different statuses (pending, in_progress, completed, rejected)
- **Tags and Categorization**: Add tags to organize and categorize requests
- **Admin Dashboard**: View and filter all submissions at `/admin/work-submissions`

## Database Schema

Two new tables have been added:

1. **work_submissions**: Main table storing all work request details
2. **work_submission_comments**: Table for tracking comments and updates on submissions

## Setup Instructions

### 1. Apply Database Migration

First, set the DATABASE_URL environment variable:
```bash
export DATABASE_URL='your-postgresql-connection-string'
# Or source from your environment file
source apps/api/.env
```

Then run the migration script:
```bash
python scripts/apply-work-submissions-migration.py
```

**Important:** Never commit database credentials to version control. Always use environment variables.

### 2. Restart Services

Restart both the API and web services to load the new changes:
```bash
# If using Docker
docker-compose restart

# If running locally
# Restart the API server and Next.js dev server
```

## Usage

### For Users

1. Click the "Submit Work Request" button in the bottom-right corner of any page
2. Fill out the form with:
   - Request Type (e.g., Feature Request, Bug Fix, Documentation)
   - Title and Description
   - Priority level
   - Your contact information
   - Optional: Role, Department, and Tags
3. Click "Submit Request"

### For Administrators

1. Navigate to `/admin/work-submissions` to view all submissions
2. Use the filters to sort by status or priority
3. Click refresh to see the latest submissions

## API Endpoints

The following API endpoints are available:

- `POST /api/work-submissions` - Create a new submission
- `GET /api/work-submissions` - List submissions (with filters)
- `GET /api/work-submissions/{id}` - Get a specific submission
- `PATCH /api/work-submissions/{id}` - Update a submission
- `POST /api/work-submissions/{id}/comments` - Add a comment

## Components

### Frontend
- `WorkSubmissionForm.tsx` - The main form component with submission button
- `/admin/work-submissions/page.tsx` - Admin dashboard for viewing submissions

### Backend
- `routers/work_submissions.py` - API router handling all submission endpoints
- `db/work_submissions.sql` - Database migration file

## Future Enhancements

Potential improvements for the future:
- Email notifications when submissions are created/updated
- File attachment support
- Bulk actions for administrators
- Export functionality
- Integration with existing ticket systems
- User authentication to track submission history

