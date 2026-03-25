-- ============================================================
-- Myntro — Sections + follower counts
-- ============================================================

-- Sections table
CREATE TABLE IF NOT EXISTS sections (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title         TEXT NOT NULL,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sections_user_id ON sections (user_id, display_order);

ALTER TABLE sections ENABLE ROW LEVEL SECURITY;

-- Drop policies first so re-runs don't fail with "policy already exists"
DROP POLICY IF EXISTS "Sections of public profiles are viewable" ON sections;
DROP POLICY IF EXISTS "Owners can read their own sections" ON sections;
DROP POLICY IF EXISTS "Owners can insert sections" ON sections;
DROP POLICY IF EXISTS "Owners can update sections" ON sections;
DROP POLICY IF EXISTS "Owners can delete sections" ON sections;

CREATE POLICY "Sections of public profiles are viewable"
  ON sections FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = sections.user_id
        AND users.profile_visibility = 'public'
    )
  );

CREATE POLICY "Owners can read their own sections"
  ON sections FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Owners can insert sections"
  ON sections FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Owners can update sections"
  ON sections FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Owners can delete sections"
  ON sections FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- Add section_id to blocks
ALTER TABLE blocks
  ADD COLUMN IF NOT EXISTS section_id UUID REFERENCES sections(id) ON DELETE SET NULL;

-- Add follower_count to links
ALTER TABLE links
  ADD COLUMN IF NOT EXISTS follower_count BIGINT DEFAULT NULL;
