-- Add featured affiliation reference to users table
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS featured_affiliation_id UUID
  REFERENCES affiliations(id) ON DELETE SET NULL;
