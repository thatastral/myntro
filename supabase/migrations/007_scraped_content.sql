-- Add scraped_content JSONB to achievements and affiliations
-- Stores title, description, and page text scraped from linked URLs at save time.
-- Used to enrich the AI assistant context.

ALTER TABLE achievements
  ADD COLUMN IF NOT EXISTS scraped_content JSONB DEFAULT NULL;

ALTER TABLE affiliations
  ADD COLUMN IF NOT EXISTS scraped_content JSONB DEFAULT NULL;
