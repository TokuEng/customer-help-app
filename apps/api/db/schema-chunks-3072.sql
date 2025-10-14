-- Alternative: Use 1536 dimensions for visa content too
-- Since pgvector has a 2000 dimension limit for indexes
CREATE TABLE chunks_visa (
  chunk_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id uuid NOT NULL,
  collection_id uuid REFERENCES collections(id) ON DELETE CASCADE,
  heading_path text,
  text text NOT NULL,
  embedding vector(1536),  -- Using text-embedding-3-small for compatibility
  created_at timestamptz DEFAULT now()
);

-- Create ivfflat index for visa chunks (1536 dimensions)
CREATE INDEX idx_chunks_visa_embedding ON chunks_visa 
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

-- Additional indexes for query performance
CREATE INDEX idx_chunks_visa_article_id ON chunks_visa(article_id);
CREATE INDEX idx_chunks_visa_collection_id ON chunks_visa(collection_id);
CREATE INDEX idx_chunks_visa_created_at ON chunks_visa(created_at DESC);

-- Update articles table to support collections
ALTER TABLE articles ADD COLUMN IF NOT EXISTS collection_id uuid REFERENCES collections(id);
ALTER TABLE articles ADD COLUMN IF NOT EXISTS source_type text DEFAULT 'notion'; -- 'notion' or 'manual'

-- Set default collection_id for existing articles
UPDATE articles 
SET collection_id = (SELECT id FROM collections WHERE collection_key = 'help_center')
WHERE collection_id IS NULL;

-- Create visa articles table for manual uploads
CREATE TABLE visa_articles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  collection_id uuid REFERENCES collections(id) ON DELETE CASCADE,
  title text NOT NULL,
  content_md text NOT NULL,
  content_html text,
  category text,
  tags text[],
  metadata jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Indexes for visa_articles
CREATE INDEX idx_visa_articles_collection_id ON visa_articles(collection_id);
CREATE INDEX idx_visa_articles_created_at ON visa_articles(created_at DESC);
CREATE INDEX idx_visa_articles_category ON visa_articles(category);
