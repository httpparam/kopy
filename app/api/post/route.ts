import { NextRequest, NextResponse } from 'next/server'
import { encrypt, generateKey, generatePasteId, hashPassword } from '@/lib/encryption'
import { insertPaste } from '@/lib/db'

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
    
    // Store in PostgreSQL
    try {
      await insertPaste({
        id: pasteId,
        encrypted_content: encryptedContent,
        sender_name: senderName || null,
        password_hash: passwordHash,
        content_type: contentType,
        expires_at: expiresAt
      })
    } catch (error) {
      console.error('Database error:', error)
      return NextResponse.json(
        { error: 'Failed to save paste to database' },
        { status: 500 }
      )
    }

    // Create shareable URL with encryption key
    // Try to get the base URL from environment variable first, then from headers, then fallback to nextUrl
    const getBaseUrl = () => {
      // Use environment variable if set
      if (process.env.NEXT_PUBLIC_BASE_URL) {
        return process.env.NEXT_PUBLIC_BASE_URL
      }
      
      // Try to get from forwarded headers (for reverse proxy)
      const forwardedHost = request.headers.get('x-forwarded-host')
      const forwardedProto = request.headers.get('x-forwarded-proto') || 'https'
      if (forwardedHost) {
        return `${forwardedProto}://${forwardedHost}`
      }
      
      // Try to get from host header
      const host = request.headers.get('host')
      if (host) {
        const proto = request.headers.get('x-forwarded-proto') || 'https'
        return `${proto}://${host}`
      }
      
      // Fallback to nextUrl (might be localhost)
      return request.nextUrl.origin
    }
    
    const baseUrl = getBaseUrl()
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
