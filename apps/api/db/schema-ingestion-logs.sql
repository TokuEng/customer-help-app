-- Ingestion logs table for tracking all ingestion activities
CREATE TABLE IF NOT EXISTS ingestion_logs (
    id SERIAL PRIMARY KEY,
    started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    status VARCHAR(50) NOT NULL DEFAULT 'running', -- running, completed, failed
    trigger_type VARCHAR(50) NOT NULL, -- scheduled, manual, webhook, api
    trigger_source VARCHAR(255), -- IP address or identifier
    pages_processed INTEGER DEFAULT 0,
    pages_skipped INTEGER DEFAULT 0,
    pages_updated INTEGER DEFAULT 0,
    pages_failed INTEGER DEFAULT 0,
    force_full_sync BOOLEAN DEFAULT FALSE,
    specific_page_ids TEXT[], -- Array of specific page IDs if targeted sync
    error_message TEXT,
    duration_seconds INTEGER, -- Calculated from started_at and completed_at
    metadata JSONB DEFAULT '{}' -- Additional metadata
);

-- Index for faster queries
CREATE INDEX idx_ingestion_logs_started_at ON ingestion_logs(started_at DESC);
CREATE INDEX idx_ingestion_logs_status ON ingestion_logs(status);

-- Ingestion events table for detailed tracking
CREATE TABLE IF NOT EXISTS ingestion_events (
    id SERIAL PRIMARY KEY,
    ingestion_log_id INTEGER REFERENCES ingestion_logs(id) ON DELETE CASCADE,
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    event_type VARCHAR(50) NOT NULL, -- page_processed, page_skipped, page_failed, error
    page_id VARCHAR(255),
    page_title TEXT,
    category VARCHAR(100),
    message TEXT,
    metadata JSONB DEFAULT '{}'
);

-- Index for faster queries
CREATE INDEX idx_ingestion_events_log_id ON ingestion_events(ingestion_log_id);
CREATE INDEX idx_ingestion_events_timestamp ON ingestion_events(timestamp DESC);

-- View for ingestion summary
CREATE OR REPLACE VIEW ingestion_summary AS
SELECT 
    DATE(started_at) as date,
    COUNT(*) as total_runs,
    COUNT(CASE WHEN status = 'completed' THEN 1 END) as successful_runs,
    COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed_runs,
    SUM(pages_processed) as total_pages_processed,
    SUM(pages_updated) as total_pages_updated,
    AVG(duration_seconds) as avg_duration_seconds
FROM ingestion_logs
GROUP BY DATE(started_at)
ORDER BY date DESC;
