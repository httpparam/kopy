import { NextRequest, NextResponse } from 'next/server'
import { encrypt, generateKey, generatePasteId, hashPassword } from '@/lib/encryption'
import { supabase } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    // Parse the request body
    const formData = await request.formData()
    const content = formData.get('content') as string
    const senderName = formData.get('senderName') as string || ''
    const password = formData.get('password') as string || ''
    const expirationMinutes = parseInt(formData.get('expirationMinutes') as string) || 10
    const contentType = formData.get('contentType') as string || 'text'

    // Validate content
    if (!content || !content.trim()) {
      return NextResponse.json(
        { error: 'Content is required' },
        { status: 400 }
      )
    }

    // Validate content type
    if (!['text', 'markdown'].includes(contentType)) {
      return NextResponse.json(
        { error: 'Invalid content type. Must be "text" or "markdown"' },
        { status: 400 }
      )
    }

    // Generate encryption key and encrypt content
    const key = generateKey()
    const encryptedContent = encrypt(content, key)
    
    // Generate unique paste ID
    const pasteId = generatePasteId()
    
    // Calculate expiration time based on selected duration
    const expiresAt = new Date(Date.now() + expirationMinutes * 60 * 1000).toISOString()
    
    // Hash password if provided
    const passwordHash = password ? hashPassword(password) : null
    
    // Store in Supabase
    const { error } = await supabase
      .from('pastes')
      .insert({
        id: pasteId,
        encrypted_content: encryptedContent,
        sender_name: senderName || null,
        password_hash: passwordHash,
        content_type: contentType,
        expires_at: expiresAt
      })

    if (error) {
      console.error('Supabase error:', error)
      return NextResponse.json(
        { error: 'Failed to save paste to database' },
        { status: 500 }
      )
    }

    // Create shareable URL with encryption key
    const baseUrl = request.nextUrl.origin
    const url = `${baseUrl}/view/${pasteId}#${encodeURIComponent(key)}`

    return NextResponse.json({
      success: true,
      url: url,
      id: pasteId,
      expiresAt: expiresAt,
      contentType: contentType,
      hasPassword: !!password
    })

  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Handle GET requests with a simple message
export async function GET() {
  return NextResponse.json({
    message: 'KOPY API - POST endpoint for creating secure pastes',
    usage: {
      method: 'POST',
      endpoint: '/api/post',
      contentType: 'multipart/form-data',
      fields: {
        content: 'string (required) - The text content to share',
        senderName: 'string (optional) - Author name',
        password: 'string (optional) - Password protection',
        expirationMinutes: 'number (optional, default: 10) - Expiration time in minutes',
        contentType: 'string (optional, default: "text") - "text" or "markdown"'
      }
    }
  })
}
