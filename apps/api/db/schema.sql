-- Enable pgvector extension
create extension if not exists vector;

-- Articles table
create table articles (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  title text not null,
  summary text,
  content_md text,
  content_html text,
  ai_rendered_html text,              -- AI-optimized HTML content
  reading_time_min int,
  type text,                 -- how-to | guide | policy | faq | process | info
  category text,             -- Library | Token Payroll | Benefits | Policy
  tags text[],
  persona text,              -- Employer/Admin | Employee | Contractor | Partner | General
  updated_at timestamptz not null default now(),
  notion_page_id text not null unique,
  visibility text default 'public'
);

-- Chunks table for semantic search
create table chunks (
  chunk_id uuid primary key default gen_random_uuid(),
  article_id uuid references articles(id) on delete cascade,
  heading_path text,
  text text not null,
  embedding vector(1536)     -- adjust to your model dimensionality
);

-- Search feedback table
create table search_feedback (
  id bigserial primary key,
  article_id uuid references articles(id) on delete cascade,
  helpful boolean,
  notes text,
  created_at timestamptz default now()
);

-- Ingestion state table
create table ingestion_state (
  id int primary key default 1,
  last_synced timestamptz,
  constraint single_row check (id = 1)
);

-- Article views/visits tracking table
create table article_views (
  id bigserial primary key,
  article_id uuid references articles(id) on delete cascade,
  ip_address inet,
  user_agent text,
  viewed_at timestamptz default now()
);

-- Search queries tracking table
create table search_queries (
  id bigserial primary key,
  query text not null,
  filters jsonb,                           -- Search filters applied (category, type, etc.)
  results_count int default 0,             -- Number of results returned
  ip_address inet,
  user_agent text,
  searched_at timestamptz default now()
);

-- Chat interactions tracking table
create table chat_interactions (
  id bigserial primary key,
  session_id text,                         -- Chat session identifier
  user_message text not null,              -- User's question/message
  assistant_response text,                 -- AI assistant's response
  contexts_used jsonb,                     -- RAG contexts used for response
  response_time_ms int,                    -- Response time in milliseconds
  ip_address inet,
  user_agent text,
  created_at timestamptz default now()
);

-- Page visits tracking table (for non-article pages)
create table page_visits (
  id bigserial primary key,
  page_path text not null,                 -- Page path (/search, /calendar, /, etc.)
  page_title text,                         -- Page title
  referrer text,                           -- Referring page/source
  ip_address inet,
  user_agent text,
  visited_at timestamptz default now()
);

-- Work submissions table
create table work_submissions (
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
create table work_submission_comments (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid references work_submissions(id) on delete cascade,
  author_name text not null,
  author_email text not null,
  comment text not null,
  is_internal boolean default false,      -- Internal comments not shown to submitter
  created_at timestamptz default now()
);

-- Indexes
create index idx_articles_slug on articles(slug);
create index idx_articles_updated_at on articles(updated_at desc);
create index idx_articles_category on articles(category);
create index idx_articles_type on articles(type);
create index idx_chunks_article_id on chunks(article_id);
create index idx_chunks_embedding on chunks using ivfflat (embedding vector_cosine_ops);
create index idx_article_views_article_id on article_views(article_id);
create index idx_article_views_viewed_at on article_views(viewed_at desc);

-- Analytics indexes
create index idx_search_queries_searched_at on search_queries(searched_at desc);
create index idx_search_queries_query on search_queries(query);
create index idx_chat_interactions_created_at on chat_interactions(created_at desc);
create index idx_chat_interactions_session_id on chat_interactions(session_id);
create index idx_page_visits_visited_at on page_visits(visited_at desc);
create index idx_page_visits_page_path on page_visits(page_path);

-- Work submissions indexes
create index idx_work_submissions_status on work_submissions(status);
create index idx_work_submissions_priority on work_submissions(priority);
create index idx_work_submissions_created_at on work_submissions(created_at desc);
create index idx_work_submissions_submitter_email on work_submissions(submitter_email);
create index idx_work_submissions_assigned_to on work_submissions(assigned_to);
create index idx_work_submission_comments_submission_id on work_submission_comments(submission_id);
create index idx_work_submission_comments_created_at on work_submission_comments(created_at desc);
