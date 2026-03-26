-- Beta testers table — separate from waitlist.
-- Waitlist = public username reservations for the launch.
-- Beta testers = curated list of users allowed to sign up during private beta.

CREATE TABLE IF NOT EXISTS beta_testers (
  id         uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  email      text        NOT NULL UNIQUE,
  note       text,
  created_at timestamptz DEFAULT now()
);

-- No public access — managed by admin via service role key only
ALTER TABLE beta_testers ENABLE ROW LEVEL SECURITY;
