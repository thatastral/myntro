-- Add feature flag columns to users table
-- tips_enabled: controls whether the Tip button appears on the public profile
-- ai_enabled:   controls whether the Ask AI button appears on the public profile

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS tips_enabled BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS ai_enabled   BOOLEAN NOT NULL DEFAULT true;
