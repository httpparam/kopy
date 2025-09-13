'use client'

import { useState, useEffect } from 'react'
import { Lock, Copy, Check, Clock, Shield } from 'lucide-react'
import { encrypt, generateKey, generatePasteId, hashPassword } from '@/lib/encryption'
import { supabase } from '@/lib/supabase'

export default function Home() {
  const [content, setContent] = useState('')
  const [senderName, setSenderName] = useState('')
  const [password, setPassword] = useState('')
  const [expirationMinutes, setExpirationMinutes] = useState(10) // Default to 10 minutes
  const [isLoading, setIsLoading] = useState(false)
  const [shareUrl, setShareUrl] = useState('')
  const [copied, setCopied] = useState(false)
  const [connectionStatus, setConnectionStatus] = useState<'checking' | 'connected' | 'error'>('checking')

  // Test Supabase connection on component mount
  useEffect(() => {
    const testConnection = async () => {
      try {
        const { data, error } = await supabase.from('pastes').select('count').limit(1)
        if (error) throw error
        setConnectionStatus('connected')
      } catch (error) {
        console.error('Supabase connection test failed:', error)
        setConnectionStatus('error')
      }
    }
    testConnection()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!content.trim()) return

    setIsLoading(true)
    try {
      // Generate encryption key and encrypt content
      const key = generateKey()
      const encryptedContent = encrypt(content, key)
      
      // Generate unique paste ID
      const pasteId = generatePasteId()
      
      // Calculate expiration time based on selected duration
      const expiresAt = new Date(Date.now() + expirationMinutes * 60 * 1000).toISOString()
      
      // Hash password if provided
      const passwordHash = password ? hashPassword(password) : null
      
      // Debug logging
      console.log('Creating paste with:', {
        hasPassword: !!password,
        passwordHash: passwordHash,
        senderName: senderName
      })
      
      // Store in Supabase
      const { error } = await supabase
        .from('pastes')
        .insert({
          id: pasteId,
          encrypted_content: encryptedContent,
          sender_name: senderName || null,
          password_hash: passwordHash,
          expires_at: expiresAt
        })

      if (error) throw error

      // Create shareable URL with encryption key
      const url = `${window.location.origin}/view/${pasteId}#${encodeURIComponent(key)}`
      setShareUrl(url)
      
      // Clear the form
      setContent('')
      setSenderName('')
      setPassword('')
      setExpirationMinutes(10) // Reset to default
    } catch (error) {
      console.error('Error creating paste:', error)
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
      alert(`Failed to create paste: ${errorMessage}\n\nPlease check:\n1. Your Supabase credentials in .env.local\n2. Database schema is set up correctly\n3. Network connection`)
    } finally {
      setIsLoading(false)
    }
  }

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      console.error('Failed to copy:', error)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-8">
      <div className="w-full max-w-4xl">
        {/* Main Content Card */}
        <div className="card">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-white mb-2">Kopy</h1>
            <p className="text-gray-300">private encrypted pastebin</p>
          </div>

          {/* Connection Status */}
          {connectionStatus === 'checking' && (
            <div className="text-center mb-6">
              <div className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-yellow-900/50 text-yellow-300 border border-yellow-700">
                <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-yellow-400 mr-2"></div>
                Checking connection...
              </div>
            </div>
          )}
          {connectionStatus === 'connected' && (
            <div className="text-center mb-6">
              <div className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-green-900/50 text-green-300 border border-green-700">
                <div className="w-2 h-2 bg-green-400 rounded-full mr-2"></div>
                Connected to database
              </div>
            </div>
          )}
          {connectionStatus === 'error' && (
            <div className="text-center mb-6">
              <div className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-red-900/50 text-red-300 border border-red-700">
                <div className="w-2 h-2 bg-red-400 rounded-full mr-2"></div>
                Database connection failed
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Text Input - Large square area */}
            <div>
              <label htmlFor="content" className="block text-sm font-medium text-gray-300 mb-2">
                Text
              </label>
              <textarea
                id="content"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Paste your text here..."
                className="input-field min-h-[300px] resize-none"
                required
              />
            </div>

            {/* Bottom Row - Name, Time, Password */}
            <div className="grid grid-cols-3 gap-4">
              {/* Name Input */}
              <div>
                <label htmlFor="senderName" className="block text-sm font-medium text-gray-300 mb-2">
                  name
                </label>
                <input
                  type="text"
                  id="senderName"
                  value={senderName}
                  onChange={(e) => setSenderName(e.target.value)}
                  placeholder="Your name..."
                  className="input-field"
                />
              </div>

              {/* Time Dropdown */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  time
                </label>
                <select
                  value={expirationMinutes}
                  onChange={(e) => setExpirationMinutes(Number(e.target.value))}
                  className="input-field"
                >
                  <option value={10}>10 minutes</option>
                  <option value={60}>1 hour</option>
                  <option value={1440}>1 day</option>
                  <option value={4320}>3 days</option>
                  <option value={10080}>1 week</option>
                </select>
              </div>

              {/* Password Input */}
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-2">
                  pass
                </label>
                <input
                  type="password"
                  id="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Password..."
                  className="input-field"
                />
              </div>
            </div>

            {/* Copy Link Button */}
            <div className="text-center">
              <button
                type="submit"
                disabled={isLoading || !content.trim()}
                className="btn-primary px-8 py-3 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2 inline-block"></div>
                    Encrypting...
                  </>
                ) : (
                  'Copy link'
                )}
              </button>
            </div>
          </form>

          {/* Share URL Display */}
          {shareUrl && (
            <div className="mt-8 p-4 rounded-lg border border-gray-700">
              <div className="flex items-center justify-between">
                <div className="flex-1 mr-4">
                  <input
                    type="text"
                    value={shareUrl}
                    readOnly
                    className="input-field text-sm"
                  />
                </div>
                <button
                  onClick={copyToClipboard}
                  className="btn-secondary flex items-center"
                >
                  {copied ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </button>
              </div>
              <p className="text-xs text-gray-400 mt-2">
                Link expires in {expirationMinutes < 60 
                  ? `${expirationMinutes} minutes` 
                  : expirationMinutes < 1440 
                    ? `${Math.round(expirationMinutes / 60)} hours`
                    : `${Math.round(expirationMinutes / 1440)} days`
                }
                {password && " • Password protected"}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 text-center px-4 w-full max-w-xs sm:max-w-none">
        <div className="flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-4 text-xs sm:text-sm text-gray-400">
          <a
            href="https://httpparam.me"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-gray-300 transition-colors whitespace-nowrap"
          >
            Made with 🩵 by http.param
          </a>
          <span className="hidden sm:inline text-gray-600">•</span>
          <a
            href="https://github.com/httpparam/kopy"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-gray-300 transition-colors whitespace-nowrap"
          >
            Source
          </a>
        </div>
      </div>
    </div>
  )
}
