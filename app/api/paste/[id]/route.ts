import { NextRequest, NextResponse } from 'next/server'
import { getPasteIfValid } from '@/lib/db'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const pasteId = id
    
    if (!pasteId) {
      return NextResponse.json(
        { error: 'Paste ID is required' },
        { status: 400 }
      )
    }

    console.log('Fetching paste with ID:', pasteId)
    const paste = await getPasteIfValid(pasteId)
    
    if (!paste) {
      console.log('Paste not found or expired:', pasteId)
      return NextResponse.json(
        { error: 'Paste not found or has expired' },
        { status: 404 }
      )
    }

    console.log('Paste found:', paste.id)
    return NextResponse.json(paste)
  } catch (error) {
    console.error('Error fetching paste:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}




