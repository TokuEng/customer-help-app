-- ============================================
-- VISA SUPPORT TABLES (ADDITIVE - DO NOT MODIFY EXISTING TABLES)
-- ============================================

-- Visa articles table (parallel to existing 'articles' table)
CREATE TABLE IF NOT EXISTS visa_articles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    content_md TEXT NOT NULL,
    content_html TEXT,
    slug TEXT UNIQUE NOT NULL,
    
    -- Visa-specific metadata
    country_code TEXT,  -- US, CA, UK, DE, SG, AE, etc.
    visa_type TEXT,     -- H1B, F1, O1, BlueCard, EP, etc.
    category TEXT,      -- eligibility, timeline, fees, process, requirements
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Full text search vector
    tsv tsvector GENERATED ALWAYS AS (
        to_tsvector('english', coalesce(title, '') || ' ' || coalesce(content_md, ''))
    ) STORED
);

-- Visa chunks table (parallel to existing 'chunks' table)
CREATE TABLE IF NOT EXISTS visa_chunks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    article_id UUID REFERENCES visa_articles(id) ON DELETE CASCADE,
    
    chunk_index INT NOT NULL,
    content TEXT NOT NULL,
    heading_path TEXT,
    token_count INT,
    
    -- Vector embedding (1536 dimensions for text-embedding-3-small)
    embedding vector(1536),
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(article_id, chunk_index)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS visa_chunks_embedding_idx 
    ON visa_chunks USING ivfflat (embedding vector_cosine_ops)
    WITH (lists = 100);

CREATE INDEX IF NOT EXISTS visa_articles_tsv_idx 
    ON visa_articles USING GIN(tsv);

CREATE INDEX IF NOT EXISTS visa_articles_country_idx 
    ON visa_articles(country_code);

CREATE INDEX IF NOT EXISTS visa_articles_visa_type_idx 
    ON visa_articles(visa_type);

CREATE INDEX IF NOT EXISTS visa_articles_slug_idx 
    ON visa_articles(slug);

-- Add collection_type to existing chat_interactions table (NON-BREAKING)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'chat_interactions' 
        AND column_name = 'collection_type'
    ) THEN
        ALTER TABLE chat_interactions 
        ADD COLUMN collection_type TEXT DEFAULT 'general' 
        CHECK (collection_type IN ('general', 'visa'));
    END IF;
END $$;

-- Create updated_at trigger for visa_articles
CREATE OR REPLACE FUNCTION update_visa_articles_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER visa_articles_updated_at_trigger
    BEFORE UPDATE ON visa_articles
    FOR EACH ROW
    EXECUTE FUNCTION update_visa_articles_updated_at();

-- Insert comment for documentation
COMMENT ON TABLE visa_articles IS 'Visa and immigration support articles - separate from general help center';
COMMENT ON TABLE visa_chunks IS 'Semantic chunks with embeddings for visa articles';
COMMENT ON COLUMN chat_interactions.collection_type IS 'Tracks whether chat was general help or visa support';
