-- ============================================================
-- Myntro — Bento Blocks
-- ============================================================

CREATE TABLE IF NOT EXISTS blocks (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type          TEXT NOT NULL CHECK (type IN ('note', 'link', 'spotify', 'youtube', 'image')),
  content       JSONB NOT NULL DEFAULT '{}',
  display_order INTEGER NOT NULL DEFAULT 0,
  span          INTEGER NOT NULL DEFAULT 1 CHECK (span IN (1, 2)),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_blocks_user_id ON blocks (user_id, display_order);

ALTER TABLE blocks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Blocks of public profiles are viewable"
  ON blocks FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = blocks.user_id
        AND users.profile_visibility = 'public'
    )
  );

CREATE POLICY "Owners can read their own blocks"
  ON blocks FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Owners can insert blocks"
  ON blocks FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Owners can update blocks"
  ON blocks FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Owners can delete blocks"
  ON blocks FOR DELETE TO authenticated
  USING (auth.uid() = user_id);
