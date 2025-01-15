-- Enable vector extension if not already enabled
CREATE EXTENSION IF NOT EXISTS vector;

-- Add vector column to messages if not exists
ALTER TABLE messages ADD COLUMN IF NOT EXISTS embedding vector(1536);

-- Create function to match messages based on embedding similarity
CREATE OR REPLACE FUNCTION match_messages(
  query_embedding vector(1536),
  match_threshold float,
  match_count int,
  p_user_id uuid
)
RETURNS TABLE (
  id bigint,
  message text,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    messages.id,
    messages.message,
    1 - (messages.embedding <=> query_embedding) as similarity
  FROM messages
  WHERE 
    messages.user_id = p_user_id
    AND messages.embedding IS NOT NULL
    AND 1 - (messages.embedding <=> query_embedding) > match_threshold
  ORDER BY similarity DESC
  LIMIT match_count;
END;
$$; 