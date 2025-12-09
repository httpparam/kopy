import { Pool } from 'pg'

// Create a connection pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
})

// Export the pool for direct queries if needed
export { pool }

// Interface for PasteData
export interface PasteData {
  id: string
  encrypted_content: string
  sender_name?: string
  password_hash?: string
  content_type?: string
  created_at: string
  expires_at: string
}

// Helper function to get a paste by ID (with expiration check)
export async function getPasteIfValid(pasteId: string): Promise<PasteData | null> {
  const client = await pool.connect()
  try {
    // First, clean up expired pastes
    await client.query('SELECT delete_expired_pastes()')
    
    // Then get the paste if it exists and is not expired
    const result = await client.query(
      'SELECT * FROM get_paste_if_valid($1)',
      [pasteId]
    )
    
    if (result.rows.length === 0) {
      return null
    }
    
    return result.rows[0] as PasteData
  } finally {
    client.release()
  }
}

// Helper function to insert a new paste
export async function insertPaste(paste: {
  id: string
  encrypted_content: string
  sender_name?: string | null
  password_hash?: string | null
  content_type: string
  expires_at: string
}): Promise<void> {
  const client = await pool.connect()
  try {
    await client.query(
      `INSERT INTO pastes (id, encrypted_content, sender_name, password_hash, content_type, expires_at)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        paste.id,
        paste.encrypted_content,
        paste.sender_name || null,
        paste.password_hash || null,
        paste.content_type,
        paste.expires_at
      ]
    )
  } finally {
    client.release()
  }
}

// Helper function to test database connection
export async function testConnection(): Promise<boolean> {
  try {
    const client = await pool.connect()
    await client.query('SELECT 1')
    client.release()
    return true
  } catch (error) {
    console.error('Database connection test failed:', error)
    return false
  }
}



