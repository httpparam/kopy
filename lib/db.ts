import { PrismaClient } from '@prisma/client'

// PrismaClient is attached to the `global` object in development to prevent
// exhausting your database connection limit.
// Learn more: https://pris.ly/d/help/nextjs-best-practices

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const prisma = globalForPrisma.prisma ?? new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
})

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

// Interface for PasteData (matches Prisma model)
export interface PasteData {
  id: string
  encrypted_content: string
  sender_name?: string | null
  password_hash?: string | null
  content_type: string
  created_at: Date | string
  expires_at: Date | string
}

// Helper function to get a paste by ID (with expiration check)
export async function getPasteIfValid(pasteId: string): Promise<PasteData | null> {
  try {
    // First, clean up expired pastes
    const now = new Date()
    await prisma.paste.deleteMany({
      where: {
        expires_at: {
          lt: now
        }
      }
    })
    
    // Then get the paste if it exists and is not expired
    const paste = await prisma.paste.findFirst({
      where: {
        id: pasteId,
        expires_at: {
          gt: now
        }
      }
    })
    
    if (!paste) {
      return null
    }
    
    // Convert Date objects to ISO strings for consistency
    return {
      id: paste.id,
      encrypted_content: paste.encrypted_content,
      sender_name: paste.sender_name,
      password_hash: paste.password_hash,
      content_type: paste.content_type,
      created_at: paste.created_at instanceof Date ? paste.created_at.toISOString() : paste.created_at,
      expires_at: paste.expires_at instanceof Date ? paste.expires_at.toISOString() : paste.expires_at,
    }
  } catch (error) {
    console.error('Error fetching paste:', error)
    return null
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
  await prisma.paste.create({
    data: {
      id: paste.id,
      encrypted_content: paste.encrypted_content,
      sender_name: paste.sender_name,
      password_hash: paste.password_hash,
      content_type: paste.content_type,
      expires_at: new Date(paste.expires_at),
    },
  })
}

// Helper function to test database connection
export async function testConnection(): Promise<boolean> {
  try {
    await prisma.$queryRaw`SELECT 1`
    return true
  } catch (error) {
    console.error('Database connection test failed:', error)
    return false
  }
}
