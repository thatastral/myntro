-- ============================================================
-- Myntro — Analytics Migration
-- ============================================================

CREATE TABLE IF NOT EXISTS analytics_events (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  event_type  TEXT NOT NULL CHECK (event_type IN ('profile_view', 'link_click', 'ai_chat', 'tip_sent')),
  metadata    JSONB,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS analytics_events_user_id_idx ON analytics_events(user_id);
CREATE INDEX IF NOT EXISTS analytics_events_created_at_idx ON analytics_events(created_at DESC);

-- RLS
ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;

-- Anyone can insert events (for tracking public profile views/clicks)
CREATE POLICY "Anyone can track events"
  ON analytics_events FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Only the profile owner can read their own events
CREATE POLICY "Owners can read own events"
  ON analytics_events FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());
