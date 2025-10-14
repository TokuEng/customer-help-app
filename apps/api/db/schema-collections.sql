-- Enable pgvector extension if not already enabled
CREATE EXTENSION IF NOT EXISTS vector;

-- Collections table for managing multiple topic collections
CREATE TABLE collections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  collection_key text UNIQUE NOT NULL,  -- 'help_center', 'visa', etc.
  name text NOT NULL,
  description text,
  embedding_model text NOT NULL,        -- 'text-embedding-3-small' or 'text-embedding-3-large'
  embedding_dimensions int NOT NULL,    -- 1536 or 3072
  meili_index_name text NOT NULL,      -- Meilisearch index name
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Insert default collections
-- Note: Using text-embedding-3-small for both due to pgvector dimension limits
INSERT INTO collections (collection_key, name, description, embedding_model, embedding_dimensions, meili_index_name)
VALUES 
  ('help_center', 'Help Center', 'General Toku help articles', 'text-embedding-3-small', 1536, 'articles'),
  ('visa', 'Visa Information', 'Visa-related documentation and guides', 'text-embedding-3-small', 1536, 'visa_articles');

-- Create index for fast lookup by collection_key
CREATE INDEX idx_collections_key ON collections(collection_key);
CREATE INDEX idx_collections_active ON collections(is_active);
