-- Analytics tracking tables for the help center

-- Search queries tracking
CREATE TABLE IF NOT EXISTS search_queries (
    id SERIAL PRIMARY KEY,
    query TEXT NOT NULL,
    user_id TEXT,
    session_id TEXT,
    results_count INTEGER DEFAULT 0,
    clicked_result BOOLEAN DEFAULT FALSE,
    collection_type VARCHAR(20) DEFAULT 'general',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Article/Page views tracking
CREATE TABLE IF NOT EXISTS page_visits (
    id SERIAL PRIMARY KEY,
    page_path TEXT NOT NULL,
    article_id UUID REFERENCES articles(id) ON DELETE SET NULL,
    user_id TEXT,
    session_id TEXT,
    referrer TEXT,
    duration_seconds INTEGER,
    collection_type VARCHAR(20) DEFAULT 'general',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_search_queries_created_at ON search_queries(created_at);
CREATE INDEX IF NOT EXISTS idx_search_queries_query ON search_queries(query);
CREATE INDEX IF NOT EXISTS idx_page_visits_created_at ON page_visits(created_at);
CREATE INDEX IF NOT EXISTS idx_page_visits_article_id ON page_visits(article_id);
CREATE INDEX IF NOT EXISTS idx_chat_interactions_created_at ON chat_interactions(created_at);
