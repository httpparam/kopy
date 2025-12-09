import { NextResponse } from 'next/server'
import { testConnection } from '@/lib/db'

export async function GET() {
  try {
    const isConnected = await testConnection()
    
    if (isConnected) {
      return NextResponse.json({ status: 'connected' })
    } else {
      return NextResponse.json(
        { status: 'error', message: 'Database connection failed' },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error('Health check error:', error)
    return NextResponse.json(
      { status: 'error', message: 'Health check failed' },
      { status: 500 }
    )
  }
}

