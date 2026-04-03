-- Add 'text' to the blocks type constraint
ALTER TABLE blocks
  DROP CONSTRAINT IF EXISTS blocks_type_check;

ALTER TABLE blocks
  ADD CONSTRAINT blocks_type_check
  CHECK (type IN ('note', 'text', 'link', 'spotify', 'music', 'youtube', 'image'));
