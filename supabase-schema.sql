-- Create the pastes table
CREATE TABLE IF NOT EXISTS pastes (
  id TEXT PRIMARY KEY,
  encrypted_content TEXT NOT NULL,
  sender_name TEXT,
  password_hash TEXT,
  content_type TEXT DEFAULT 'text',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL
);

-- Create an index on expires_at for efficient cleanup
CREATE INDEX IF NOT EXISTS idx_pastes_expires_at ON pastes(expires_at);

-- Enable Row Level Security
ALTER TABLE pastes ENABLE ROW LEVEL SECURITY;

-- Create a policy that allows anyone to insert pastes
CREATE POLICY "Allow anyone to insert pastes" ON pastes
  FOR INSERT WITH CHECK (true);

-- Create a policy that allows anyone to read pastes (for viewing shared content)
CREATE POLICY "Allow anyone to read pastes" ON pastes
  FOR SELECT USING (true);

-- Create a function to auimage.pngtomatically delete expired pastes
CREATE OR REPLACE FUNCTION delete_expired_pastes()
RETURNS void AS $$
BEGIN
  DELETE FROM pastes WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- Drop the existing function first (if it exists)
DROP FUNCTION IF EXISTS get_paste_if_valid(TEXT);

-- Create a function to clean up expired pastes when reading
CREATE OR REPLACE FUNCTION get_paste_if_valid(paste_id TEXT)
RETURNS TABLE(id TEXT, encrypted_content TEXT, sender_name TEXT, password_hash TEXT, content_type TEXT, created_at TIMESTAMP WITH TIME ZONE, expires_at TIMESTAMP WITH TIME ZONE) AS $$
BEGIN
  -- First, clean up expired pastes
  PERFORM delete_expired_pastes();
  
  -- Then return the paste if it exists and is not expired
  RETURN QUERY
  SELECT p.id, p.encrypted_content, p.sender_name, p.password_hash, p.content_type, p.created_at, p.expires_at
  FROM pastes p
  WHERE p.id = paste_id AND p.expires_at > NOW();
END;
$$ LANGUAGE plpgsql;
