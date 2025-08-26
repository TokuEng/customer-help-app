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

-- Indexes
create index idx_articles_slug on articles(slug);
create index idx_articles_updated_at on articles(updated_at desc);
create index idx_articles_category on articles(category);
create index idx_articles_type on articles(type);
create index idx_chunks_article_id on chunks(article_id);
create index idx_chunks_embedding on chunks using ivfflat (embedding vector_cosine_ops);
