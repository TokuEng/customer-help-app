#!/usr/bin/env python3
"""
Apply the work submissions database migration
"""

import os
import sys
import asyncio
import asyncpg
from pathlib import Path

# Add parent directory to path
sys.path.append(str(Path(__file__).parent.parent))

async def apply_migration():
    """Apply the work submissions migration"""
    
    # Get database URL from environment
    database_url = os.getenv('DATABASE_URL')
    if not database_url:
        print("Error: DATABASE_URL environment variable not set")
        print("Please set the DATABASE_URL environment variable before running this script")
        print("Example: export DATABASE_URL='postgresql://...'")
        return False
    
    try:
        # Connect to database
        conn = await asyncpg.connect(database_url)
        
        print("Connected to database")
        
        # Define migration SQL directly since it's already in schema.sql
        migration_sql = """
        -- Work submissions table
        create table if not exists work_submissions (
          id uuid primary key default gen_random_uuid(),
          -- Request details
          request_type text not null,             -- Type of work submission
          title text not null,                    -- Title/subject of the request
          description text not null,              -- Detailed description
          priority text,                          -- low | medium | high | urgent
          status text default 'pending',          -- pending | in_progress | completed | rejected
          
          -- Submitter information
          submitter_name text not null,
          submitter_email text not null,
          submitter_role text,                    -- employee | contractor | admin | other
          department text,
          
          -- Additional metadata
          attachments jsonb,                      -- Array of attachment URLs/metadata
          tags text[],                            -- Array of tags for categorization
          assigned_to text,                       -- Assignee name/email
          
          -- Timestamps
          created_at timestamptz default now(),
          updated_at timestamptz default now(),
          completed_at timestamptz,
          
          -- Notes and tracking
          internal_notes text,                    -- For internal team use
          resolution_notes text                   -- Final resolution/completion notes
        );

        -- Comments/updates table for tracking communication
        create table if not exists work_submission_comments (
          id uuid primary key default gen_random_uuid(),
          submission_id uuid references work_submissions(id) on delete cascade,
          author_name text not null,
          author_email text not null,
          comment text not null,
          is_internal boolean default false,      -- Internal comments not shown to submitter
          created_at timestamptz default now()
        );

        -- Work submissions indexes
        create index if not exists idx_work_submissions_status on work_submissions(status);
        create index if not exists idx_work_submissions_priority on work_submissions(priority);
        create index if not exists idx_work_submissions_created_at on work_submissions(created_at desc);
        create index if not exists idx_work_submissions_submitter_email on work_submissions(submitter_email);
        create index if not exists idx_work_submissions_assigned_to on work_submissions(assigned_to);
        create index if not exists idx_work_submission_comments_submission_id on work_submission_comments(submission_id);
        create index if not exists idx_work_submission_comments_created_at on work_submission_comments(created_at desc);
        """
        
        # Apply migration
        await conn.execute(migration_sql)
        
        print("Successfully applied work submissions migration")
        
        # Verify tables were created
        tables_exist = await conn.fetch("""
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name IN ('work_submissions', 'work_submission_comments')
            ORDER BY table_name
        """)
        
        print("\nCreated tables:")
        for row in tables_exist:
            print(f"  - {row['table_name']}")
        
        await conn.close()
        return True
        
    except asyncpg.exceptions.DuplicateTableError as e:
        print(f"Tables already exist: {e}")
        return True
    except Exception as e:
        print(f"Error applying migration: {e}")
        return False

if __name__ == "__main__":
    success = asyncio.run(apply_migration())
    sys.exit(0 if success else 1)

