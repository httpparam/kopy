import { NextRequest, NextResponse } from 'next/server'
import { getPasteIfValid } from '@/lib/db'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const pasteId = params.id
    
    if (!pasteId) {
      return NextResponse.json(
        { error: 'Paste ID is required' },
        { status: 400 }
      )
    }

    const paste = await getPasteIfValid(pasteId)
    
    if (!paste) {
      return NextResponse.json(
        { error: 'Paste not found or has expired' },
        { status: 404 }
      )
    }

    return NextResponse.json(paste)
  } catch (error) {
    console.error('Error fetching paste:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

