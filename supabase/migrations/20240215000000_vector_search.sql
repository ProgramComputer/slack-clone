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
-- Create a function for text similarity using ts_vectors with safer query parsing
CREATE OR REPLACE FUNCTION text_similarity(query text, document text) 
RETURNS float AS $$
BEGIN
  RETURN ts_rank(
    to_tsvector('english', document), 
    websearch_to_tsquery('english', query)
  );
EXCEPTION 
  WHEN OTHERS THEN
    -- Return 0 similarity if the query is invalid
    RETURN 0.0;
END;
$$ LANGUAGE plpgsql;

-- Updated hybrid search function with qualified column names
CREATE OR REPLACE FUNCTION match_messages_hybrid(
  query_text text,
  query_embedding vector(1536),
  match_threshold float,
  match_count int,
  p_user_id uuid = NULL,
  vector_weight float DEFAULT 0.7
)
RETURNS TABLE (
  id bigint,
  message text,
  similarity float,
  vector_score float,
  text_score float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  WITH scored_messages AS (
    SELECT
      messages.id,
      messages.message,
      1 - (messages.embedding <=> query_embedding) as msg_vector_score,
      text_similarity(query_text, messages.message) as msg_text_score
    FROM messages
    WHERE 
      (p_user_id IS NULL OR messages.user_id = p_user_id)
      AND messages.embedding IS NOT NULL
  )
  SELECT
    scored_messages.id,
    scored_messages.message,
    (vector_weight * msg_vector_score + (1-vector_weight) * msg_text_score) as similarity,
    msg_vector_score as vector_score,
    msg_text_score as text_score
  FROM scored_messages
  WHERE 
    (vector_weight * msg_vector_score + (1-vector_weight) * msg_text_score) > match_threshold
  ORDER BY similarity DESC
  LIMIT match_count;
END;
$$;