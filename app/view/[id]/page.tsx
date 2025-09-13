'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { Shield, Clock, AlertCircle, Copy, Check } from 'lucide-react'
import { decrypt, verifyPassword } from '@/lib/encryption'
import { supabase } from '@/lib/supabase'

interface PasteData {
  id: string
  encrypted_content: string
  sender_name?: string
  password_hash?: string
  created_at: string
  expires_at: string
}

export default function ViewPaste() {
  const params = useParams()
  const [paste, setPaste] = useState<PasteData | null>(null)
  const [decryptedContent, setDecryptedContent] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [timeLeft, setTimeLeft] = useState('')
  const [copied, setCopied] = useState(false)
  const [password, setPassword] = useState('')
  const [passwordError, setPasswordError] = useState('')
  const [isPasswordProtected, setIsPasswordProtected] = useState(false)
  const [isPasswordVerified, setIsPasswordVerified] = useState(false)

  useEffect(() => {
    const fetchPaste = async () => {
      try {
        const pasteId = params.id as string
        const hash = window.location.hash.substring(1) // Remove the #
        
        if (!hash) {
          setError('Invalid link: Missing decryption key')
          setIsLoading(false)
          return
        }

        const decryptionKey = decodeURIComponent(hash)

        // Fetch paste data using the custom function
        const { data, error: fetchError } = await supabase
          .rpc('get_paste_if_valid', { paste_id: pasteId })

        if (fetchError) {
          throw fetchError
        }

        if (!data || data.length === 0) {
          setError('Paste not found or has expired')
          setIsLoading(false)
          return
        }

        const pasteData = data[0] as PasteData
        setPaste(pasteData)

        // Debug logging
        console.log('Paste data:', pasteData)
        console.log('Password hash:', pasteData.password_hash)

        // Calculate time left FIRST (for both password protected and non-protected pastes)
        const expiresAt = new Date(pasteData.expires_at)
        const now = new Date()
        const timeDiff = expiresAt.getTime() - now.getTime()

        console.log('Time calculation:', {
          expiresAt: expiresAt.toISOString(),
          now: now.toISOString(),
          timeDiff: timeDiff,
          timeDiffMinutes: Math.floor(timeDiff / 60000)
        })

        if (timeDiff <= 0) {
          setError('This paste has expired')
          setIsLoading(false)
          return
        }

        // Set up time interval for ALL pastes (password protected or not)
        const updateTimeLeft = () => {
          const now = new Date()
          const timeDiff = expiresAt.getTime() - now.getTime()
          
          if (timeDiff <= 0) {
            setError('This paste has expired')
            setTimeLeft('0m 0s')
            return
          }

          const totalMinutes = Math.floor(timeDiff / 60000)
          const seconds = Math.floor((timeDiff % 60000) / 1000)
          
          let timeString
          if (totalMinutes >= 60) {
            const hours = Math.floor(totalMinutes / 60)
            const minutes = totalMinutes % 60
            timeString = `${hours}h ${minutes}m ${seconds}s`
          } else {
            timeString = `${totalMinutes}m ${seconds}s`
          }
          
          console.log('Setting time left:', timeString)
          setTimeLeft(timeString)
        }

        // Set initial time
        updateTimeLeft()
        
        // Set up interval for updates
        const interval = setInterval(updateTimeLeft, 1000)

        // Check if password protected
        if (pasteData.password_hash) {
          console.log('Paste is password protected')
          setIsPasswordProtected(true)
          setIsLoading(false)
          return
        }

        // Decrypt the content if not password protected
        try {
          const decrypted = decrypt(pasteData.encrypted_content, decryptionKey)
          setDecryptedContent(decrypted)
          setIsPasswordVerified(true) // This is correct for non-password protected pastes
        } catch (decryptError) {
          setError('Failed to decrypt content. The link may be corrupted.')
          setIsLoading(false)
          return
        }

        setIsLoading(false)

        // Cleanup interval on unmount
        return () => clearInterval(interval)

      } catch (err) {
        console.error('Error fetching paste:', err)
        setError('Failed to load paste. Please check the link and try again.')
        setIsLoading(false)
      }
    }

    fetchPaste()
  }, [params.id])

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!password.trim() || !paste) return

    setPasswordError('')
    
    // Verify password
    if (verifyPassword(password, paste.password_hash!)) {
      try {
        const hash = window.location.hash.substring(1)
        const decryptionKey = decodeURIComponent(hash)
        const decrypted = decrypt(paste.encrypted_content, decryptionKey)
        setDecryptedContent(decrypted)
        setIsPasswordVerified(true)
      } catch (decryptError) {
        setError('Failed to decrypt content. The link may be corrupted.')
      }
    } else {
      setPasswordError('Incorrect password. Please try again.')
    }
  }

  const copyContent = async () => {
    try {
      await navigator.clipboard.writeText(decryptedContent)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      console.error('Failed to copy:', error)
    }
  }

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="card text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-300">Loading your secure paste...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="card text-center">
          <AlertCircle className="h-12 w-12 text-red-400 mx-auto mb-4" />
          <h2 className="text-2xl font-semibold text-white mb-2">Error</h2>
          <p className="text-gray-300 mb-6">{error}</p>
          <a
            href="/"
            className="btn-primary inline-flex items-center"
          >
            Create New Paste
          </a>
        </div>
      </div>
    )
  }

  // Show password form if paste is password protected and not verified
  if (isPasswordProtected && !isPasswordVerified) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="card max-w-md mx-auto">
          <div className="text-center mb-6">
            <Shield className="h-12 w-12 text-blue-500 mx-auto mb-4" />
            <h1 className="text-2xl font-semibold text-white mb-2">Password Protected</h1>
            <p className="text-gray-300">
              This paste is protected with a password. Please enter the password to view the content.
            </p>
          </div>

          <form onSubmit={handlePasswordSubmit} className="space-y-4">
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-2">
                Password
              </label>
              <input
                type="password"
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password..."
                className="input-field"
                required
              />
              {passwordError && (
                <p className="text-red-500 text-sm mt-1">{passwordError}</p>
              )}
            </div>
            
            <button
              type="submit"
              className="btn-primary w-full"
            >
              Unlock Content
            </button>
          </form>

        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-8">
      <div className="w-full max-w-4xl">
        <div className="card">
          {/* Header with name and time left */}
          <div className="flex items-center gap-4 mb-6">
            {/* Name Display */}
            <div className="border border-gray-700 rounded-lg px-4 py-2">
              <span className="text-sm text-gray-400">name</span>
              <p className="text-white font-medium">
                {paste?.sender_name || 'Anonymous'}
              </p>
            </div>
            
            {/* Time Left Display */}
            <div className="border border-yellow-600 rounded-lg px-4 py-2 bg-yellow-900/10">
              <span className="text-sm text-yellow-400">time left</span>
              <p className="text-yellow-300 font-bold text-lg">
                {timeLeft || 'Calculating...'}
              </p>
            </div>
          </div>

          {/* Text Display Area */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              text
            </label>
            <div className="relative">
              <textarea
                value={decryptedContent}
                readOnly
                className="input-field min-h-[400px] resize-none"
              />
              <button
                onClick={copyContent}
                className="absolute top-2 right-2 btn-secondary text-xs py-1 px-2 flex items-center"
              >
                {copied ? (
                  <>
                    <Check className="h-3 w-3 mr-1" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="h-3 w-3 mr-1" />
                    Copy
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Security Notice */}
          <div className="mt-6 bg-blue-900/50 border border-blue-700 rounded-lg p-4">
            <p className="text-sm text-blue-300">
              <strong>Security Notice:</strong> This content is encrypted and will be automatically deleted when it expires. 
              The decryption key is embedded in the URL and cannot be recovered.
            </p>
          </div>

        </div>
      </div>

      {/* Footer */}
      <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 text-center">
        <a
          href="https://httpparam.me"
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm text-gray-400 hover:text-gray-300 transition-colors"
        >
          http.param
        </a>
      </div>
    </div>
  )
}
