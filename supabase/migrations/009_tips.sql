CREATE TABLE IF NOT EXISTS tips (
  id                uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  recipient_user_id uuid        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  sender_wallet     text        NOT NULL,
  amount            numeric     NOT NULL,
  token             text        NOT NULL,
  tx_signature      text        NOT NULL UNIQUE,
  created_at        timestamptz DEFAULT now()
);

ALTER TABLE tips ENABLE ROW LEVEL SECURITY;

-- Recipients can read their own tips (service role used in API routes bypasses this)
CREATE POLICY "tips_select_own" ON tips
  FOR SELECT USING (recipient_user_id = auth.uid());
