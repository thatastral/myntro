-- ============================================================
-- Myntro — Initial Database Migration
-- ============================================================
-- Enable required extensions
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "vector";

-- ============================================================
-- TABLES
-- ============================================================

-- Users / Profiles
CREATE TABLE IF NOT EXISTS users (
  id              UUID PRIMARY KEY,  -- matches auth.users.id
  email           TEXT NOT NULL UNIQUE,
  username        TEXT NOT NULL UNIQUE,
  name            TEXT NOT NULL DEFAULT '',
  bio             TEXT,
  avatar_url      TEXT,
  location        TEXT,
  profile_visibility TEXT NOT NULL DEFAULT 'public'
    CHECK (profile_visibility IN ('public', 'private')),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enforce lowercase, alphanumeric + underscore, 3-30 chars on username
ALTER TABLE users
  ADD CONSTRAINT username_format
  CHECK (username ~ '^[a-z0-9_]{3,30}$');

-- Links
CREATE TABLE IF NOT EXISTS links (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title         TEXT NOT NULL,
  url           TEXT NOT NULL,
  icon          TEXT,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Achievements
CREATE TABLE IF NOT EXISTS achievements (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title       TEXT NOT NULL,
  description TEXT,
  date        DATE,
  link        TEXT,
  image_url   TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Affiliations
CREATE TABLE IF NOT EXISTS affiliations (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id        UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  community_name TEXT NOT NULL,
  role           TEXT,
  logo_url       TEXT,
  proof_link     TEXT,
  verified       BOOLEAN NOT NULL DEFAULT FALSE,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Wallets (Solana)
CREATE TABLE IF NOT EXISTS wallets (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id        UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  wallet_address TEXT NOT NULL,
  network        TEXT NOT NULL DEFAULT 'mainnet-beta',
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, wallet_address)
);

-- Documents (uploaded CVs / files)
CREATE TABLE IF NOT EXISTS documents (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  file_url    TEXT NOT NULL,
  parsed_text TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Embeddings (pgvector — 1536 dimensions for deepseek-embedding / text-embedding-3-small)
CREATE TABLE IF NOT EXISTS embeddings (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  document_id  UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content      TEXT NOT NULL,
  embedding    VECTOR(1536),
  chunk_index  INTEGER NOT NULL DEFAULT 0,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- INDEXES
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_users_username ON users (username);
CREATE INDEX IF NOT EXISTS idx_links_user_id ON links (user_id, display_order);
CREATE INDEX IF NOT EXISTS idx_achievements_user_id ON achievements (user_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_affiliations_user_id ON affiliations (user_id);
CREATE INDEX IF NOT EXISTS idx_wallets_user_id ON wallets (user_id);
CREATE INDEX IF NOT EXISTS idx_documents_user_id ON documents (user_id);
CREATE INDEX IF NOT EXISTS idx_embeddings_user_id ON embeddings (user_id);

-- IVFFlat index for approximate nearest-neighbor vector search
-- Lists = sqrt(number of expected rows); adjust after data grows
CREATE INDEX IF NOT EXISTS idx_embeddings_vector
  ON embeddings USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);

-- ============================================================
-- UPDATED_AT TRIGGER
-- ============================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE users         ENABLE ROW LEVEL SECURITY;
ALTER TABLE links         ENABLE ROW LEVEL SECURITY;
ALTER TABLE achievements  ENABLE ROW LEVEL SECURITY;
ALTER TABLE affiliations  ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallets       ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents     ENABLE ROW LEVEL SECURITY;
ALTER TABLE embeddings    ENABLE ROW LEVEL SECURITY;

-- -------------------------------------------------------
-- users
-- -------------------------------------------------------

-- Public profiles are readable by anyone (anon + authenticated)
CREATE POLICY "Public profiles are viewable by anyone"
  ON users FOR SELECT
  USING (profile_visibility = 'public');

-- Private profiles are only visible to the owner
CREATE POLICY "Private profiles visible to owner"
  ON users FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

-- Users can insert their own profile (created via API after OAuth)
CREATE POLICY "Users can insert their own profile"
  ON users FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "Users can update their own profile"
  ON users FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Users can delete their own profile
CREATE POLICY "Users can delete their own profile"
  ON users FOR DELETE
  TO authenticated
  USING (auth.uid() = id);

-- -------------------------------------------------------
-- links
-- -------------------------------------------------------

-- Anyone can read links of public profiles
CREATE POLICY "Links of public profiles are viewable"
  ON links FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = links.user_id
        AND users.profile_visibility = 'public'
    )
  );

-- Owners can always read their own links
CREATE POLICY "Owners can read their own links"
  ON links FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Owners can insert links"
  ON links FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Owners can update links"
  ON links FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Owners can delete links"
  ON links FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- -------------------------------------------------------
-- achievements
-- -------------------------------------------------------

CREATE POLICY "Achievements of public profiles are viewable"
  ON achievements FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = achievements.user_id
        AND users.profile_visibility = 'public'
    )
  );

CREATE POLICY "Owners can read their own achievements"
  ON achievements FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Owners can insert achievements"
  ON achievements FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Owners can update achievements"
  ON achievements FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Owners can delete achievements"
  ON achievements FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- -------------------------------------------------------
-- affiliations
-- -------------------------------------------------------

CREATE POLICY "Affiliations of public profiles are viewable"
  ON affiliations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = affiliations.user_id
        AND users.profile_visibility = 'public'
    )
  );

CREATE POLICY "Owners can read their own affiliations"
  ON affiliations FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Owners can insert affiliations"
  ON affiliations FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Owners can update affiliations"
  ON affiliations FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Owners can delete affiliations"
  ON affiliations FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- -------------------------------------------------------
-- wallets
-- -------------------------------------------------------

-- Wallet addresses of public profiles are visible (needed for tip page)
CREATE POLICY "Wallets of public profiles are viewable"
  ON wallets FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = wallets.user_id
        AND users.profile_visibility = 'public'
    )
  );

CREATE POLICY "Owners can read their own wallets"
  ON wallets FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Owners can insert wallets"
  ON wallets FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Owners can update wallets"
  ON wallets FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Owners can delete wallets"
  ON wallets FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- -------------------------------------------------------
-- documents
-- -------------------------------------------------------

CREATE POLICY "Owners can read their own documents"
  ON documents FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Owners can insert documents"
  ON documents FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Owners can update documents"
  ON documents FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Owners can delete documents"
  ON documents FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- -------------------------------------------------------
-- embeddings
-- -------------------------------------------------------

CREATE POLICY "Owners can read their own embeddings"
  ON embeddings FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Owners can insert embeddings"
  ON embeddings FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Owners can delete embeddings"
  ON embeddings FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- ============================================================
-- VECTOR SEARCH RPC FUNCTION
-- ============================================================
-- Called from /api/ai/chat with match_embeddings(...)
-- Requires service role key for cross-user queries (AI chat),
-- or can be called with anon key if policy allows the read.
-- We use a SECURITY DEFINER function so the AI route can query
-- embeddings for any public-profile user.
-- ============================================================

CREATE OR REPLACE FUNCTION match_embeddings(
  query_embedding  VECTOR(1536),
  match_user_id    UUID,
  match_threshold  FLOAT   DEFAULT 0.7,
  match_count      INTEGER DEFAULT 5
)
RETURNS TABLE (
  id          UUID,
  content     TEXT,
  similarity  FLOAT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    e.id,
    e.content,
    1 - (e.embedding <=> query_embedding) AS similarity
  FROM embeddings e
  WHERE e.user_id = match_user_id
    AND 1 - (e.embedding <=> query_embedding) >= match_threshold
  ORDER BY e.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- Grant execute to authenticated and anon roles
GRANT EXECUTE ON FUNCTION match_embeddings TO authenticated, anon;

-- ============================================================
-- STORAGE BUCKETS (run in Supabase dashboard or via CLI)
-- ============================================================
-- Uncomment if running via Supabase CLI migration:

-- INSERT INTO storage.buckets (id, name, public)
-- VALUES ('documents', 'documents', false)
-- ON CONFLICT (id) DO NOTHING;

-- CREATE POLICY "Owners can upload documents"
--   ON storage.objects FOR INSERT
--   TO authenticated
--   WITH CHECK (bucket_id = 'documents' AND (storage.foldername(name))[1] = 'cv' AND auth.uid()::text = (storage.foldername(name))[2]);

-- CREATE POLICY "Owners can read their own documents"
--   ON storage.objects FOR SELECT
--   TO authenticated
--   USING (bucket_id = 'documents' AND auth.uid()::text = (storage.foldername(name))[2]);

-- CREATE POLICY "Owners can delete their own documents"
--   ON storage.objects FOR DELETE
--   TO authenticated
--   USING (bucket_id = 'documents' AND auth.uid()::text = (storage.foldername(name))[2]);
