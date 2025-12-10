import { NextRequest, NextResponse } from 'next/server'
import { getPasteIfValid } from '@/lib/db'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const pasteId = id?.trim()
    
    // Validate paste ID format (should be hex string)
    if (!pasteId || pasteId.length < 10 || !/^[a-f0-9]+$/i.test(pasteId)) {
      return NextResponse.json(
        { error: 'Invalid paste ID' },
        { status: 400 }
      )
    }

    const paste = await getPasteIfValid(pasteId)
    
    if (!paste) {
      // Don't differentiate between not found and expired for security
      return NextResponse.json(
        { error: 'Paste not found or has expired' },
        { status: 404 }
      )
    }

    // Remove sensitive fields before sending (password_hash is already optional)
    const { password_hash, ...safePaste } = paste
    
    return NextResponse.json(safePaste)
  } catch (error) {
    // Log error for server-side debugging but don't expose details
    console.error('Error fetching paste:', error instanceof Error ? error.message : 'Unknown error')
    
    // Return generic error to prevent information leakage
    return NextResponse.json(
      { error: 'Failed to retrieve paste' },
      { status: 500 }
    )
  }
}




