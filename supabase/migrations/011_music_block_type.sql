-- Add 'music' to the blocks type constraint
ALTER TABLE blocks
  DROP CONSTRAINT IF EXISTS blocks_type_check;

ALTER TABLE blocks
  ADD CONSTRAINT blocks_type_check
  CHECK (type IN ('note', 'link', 'spotify', 'music', 'youtube', 'image'));
