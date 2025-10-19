-- Add missing columns to visa_articles table
ALTER TABLE visa_articles 
ADD COLUMN IF NOT EXISTS slug TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS country_code TEXT,
ADD COLUMN IF NOT EXISTS visa_type TEXT;

-- Generate slugs for existing records (if any)
UPDATE visa_articles 
SET slug = lower(regexp_replace(title, '[^a-zA-Z0-9]+', '-', 'g'))
WHERE slug IS NULL;

-- Make slug NOT NULL after populating it
ALTER TABLE visa_articles 
ALTER COLUMN slug SET NOT NULL;

-- Add the full text search vector column
ALTER TABLE visa_articles 
ADD COLUMN IF NOT EXISTS tsv tsvector 
GENERATED ALWAYS AS (
    to_tsvector('english', coalesce(title, '') || ' ' || coalesce(content_md, ''))
) STORED;

-- Create indexes for the new columns
CREATE INDEX IF NOT EXISTS visa_articles_tsv_idx 
    ON visa_articles USING GIN(tsv);

CREATE INDEX IF NOT EXISTS visa_articles_country_idx 
    ON visa_articles(country_code);

CREATE INDEX IF NOT EXISTS visa_articles_visa_type_idx 
    ON visa_articles(visa_type);

CREATE INDEX IF NOT EXISTS visa_articles_slug_idx 
    ON visa_articles(slug);
