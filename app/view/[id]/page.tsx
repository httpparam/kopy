'use client'

import { useEffect, useState, useRef } from 'react'
import { useParams } from 'next/navigation'
import { Shield, Clock, AlertCircle, Copy, Check } from 'lucide-react'
import { decrypt, verifyPassword } from '@/lib/encryption'

interface PasteData {
  id: string
  encrypted_content: string
  sender_name?: string
  password_hash?: string
  content_type?: string
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
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    // Ensure we're on the client side
    if (typeof window === 'undefined') return
    
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

        // Fetch paste data using API route
        const response = await fetch(`/api/paste/${pasteId}`)

        if (!response.ok) {
          if (response.status === 404) {
          setError('Paste not found or has expired')
          } else {
            setError('Failed to load paste')
          }
          setIsLoading(false)
          return
        }

        const pasteData = await response.json() as PasteData
        
        // Validate paste data structure
        if (!pasteData || !pasteData.id || !pasteData.encrypted_content) {
          setError('Invalid paste data received')
          setIsLoading(false)
          return
        }
        
        setPaste(pasteData)

        // Calculate time left FIRST (for both password protected and non-protected pastes)
        const expiresAt = new Date(pasteData.expires_at)
        const now = new Date()
        
        // Validate date
        if (isNaN(expiresAt.getTime())) {
          setError('Invalid expiration date')
          setIsLoading(false)
          return
        }
        
        const timeDiff = expiresAt.getTime() - now.getTime()

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
          
          setTimeLeft(timeString)
        }

        // Set initial time
        updateTimeLeft()
        
        // Set up interval for updates and store in ref
        intervalRef.current = setInterval(updateTimeLeft, 1000)

        // Check if password protected
        if (pasteData.password_hash) {
          setIsPasswordProtected(true)
          setIsLoading(false)
          return
        }

        // Decrypt the content if not password protected
        try {
          // Validate decryption key format
          if (!decryptionKey || decryptionKey.length < 10) {
            setError('Invalid decryption key')
            setIsLoading(false)
            return
          }
          
          const decrypted = decrypt(pasteData.encrypted_content, decryptionKey)
          
          // Validate decryption result
          if (decrypted === '' || !decrypted) {
            setError('Failed to decrypt content. The link may be corrupted or invalid.')
            setIsLoading(false)
            return
          }
          
          setDecryptedContent(decrypted)
          setIsPasswordVerified(true)
        } catch (decryptError) {
          // Don't expose decryption errors to prevent information leakage
          console.error('Decryption error:', decryptError)
          setError('Failed to decrypt content. Please verify the link is correct and try again.')
          setIsLoading(false)
          return
        }

        setIsLoading(false)

      } catch (err) {
        // Log error for debugging but don't expose details to user
        console.error('Error fetching paste:', err)
        
        // Provide generic error message to prevent information leakage
        if (err instanceof TypeError && err.message.includes('fetch')) {
          setError('Network error. Please check your connection and try again.')
        } else {
          setError('Failed to load paste. Please verify the link is correct.')
        }
        setIsLoading(false)
      }
    }

    fetchPaste()

    // Cleanup function - return from useEffect, not from inside async function
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
  }, [params.id])

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!password.trim() || !paste) return

    setPasswordError('')
    
    try {
      // Verify password
      if (!paste.password_hash) {
        setPasswordError('This paste is not password protected.')
        return
      }
      
      if (verifyPassword(password, paste.password_hash)) {
        try {
          const hash = window.location.hash.substring(1)
          if (!hash) {
            setError('Invalid link: Missing decryption key')
            return
          }
          
          const decryptionKey = decodeURIComponent(hash)
          
          // Validate decryption key
          if (!decryptionKey || decryptionKey.length < 10) {
            setError('Invalid decryption key')
            return
          }
          
          const decrypted = decrypt(paste.encrypted_content, decryptionKey)
          
          // Validate decryption result
          if (!decrypted || decrypted === '') {
            setError('Failed to decrypt content. The link may be corrupted.')
            return
          }
          
          setDecryptedContent(decrypted)
          setIsPasswordVerified(true)
        } catch (decryptError) {
          // Don't expose decryption errors
          console.error('Decryption error:', decryptError)
          setError('Failed to decrypt content. Please verify the link is correct.')
        }
      } else {
        setPasswordError('Incorrect password. Please try again.')
      }
    } catch (error) {
      console.error('Password verification error:', error)
      setPasswordError('An error occurred. Please try again.')
    }
  }

  const copyContent = async () => {
    // Validate content exists
    if (!decryptedContent || decryptedContent.trim() === '') {
      return
    }

    try {
      // Check if we're in a secure context (HTTPS or localhost)
      const isSecureContext = window.isSecureContext || 
                              window.location.protocol === 'https:' ||
                              window.location.hostname === 'localhost' ||
                              window.location.hostname === '127.0.0.1'

      // Try modern Clipboard API first (requires secure context)
      if (navigator.clipboard && isSecureContext) {
        try {
          await navigator.clipboard.writeText(decryptedContent)
          setCopied(true)
          setTimeout(() => setCopied(false), 2000)
          return
        } catch (clipboardError: any) {
          // Silently handle security errors - they're expected in insecure contexts
          if (clipboardError?.name === 'SecurityError' || 
              clipboardError?.name === 'NotAllowedError' ||
              clipboardError?.message?.toLowerCase().includes('insecure') ||
              clipboardError?.message?.toLowerCase().includes('permission')) {
            // Expected in insecure contexts, fall through to fallback
          } else {
            // Other errors, log but don't expose to user
            console.warn('Clipboard API error:', clipboardError)
          }
        }
      }
      
      // Fallback: Use execCommand (works in more contexts but deprecated)
      // Only use if clipboard API isn't available or failed
      if (document.queryCommandSupported && document.queryCommandSupported('copy')) {
        const textArea = document.createElement('textarea')
        textArea.value = decryptedContent
        textArea.style.position = 'fixed'
        textArea.style.left = '-999999px'
        textArea.style.top = '-999999px'
        textArea.setAttribute('readonly', '')
        textArea.setAttribute('aria-hidden', 'true')
        textArea.style.opacity = '0'
        textArea.style.pointerEvents = 'none'
        
        document.body.appendChild(textArea)
        
        try {
          // Focus and select
          textArea.focus()
          textArea.select()
          textArea.setSelectionRange(0, decryptedContent.length)
          
          const success = document.execCommand('copy')
          
          if (success) {
            setCopied(true)
            setTimeout(() => setCopied(false), 2000)
          } else {
            throw new Error('execCommand copy failed')
          }
        } catch (err: any) {
          // Silently handle security errors
          if (err?.name === 'SecurityError' || 
              err?.name === 'DOMException' ||
              err?.message?.toLowerCase().includes('insecure') ||
              err?.message?.toLowerCase().includes('not allowed')) {
            // Expected in some contexts, don't log or alert
          } else {
            console.warn('Fallback copy method failed:', err)
          }
        } finally {
          // Always clean up
          if (document.body.contains(textArea)) {
            document.body.removeChild(textArea)
          }
        }
      }
      
      // If both methods failed silently, the textarea is already selected
      // User can manually copy with Ctrl+C / Cmd+C
      
    } catch (error: any) {
      // Catch any unexpected errors - don't expose details
      if (error?.name !== 'SecurityError' && 
          error?.name !== 'DOMException' &&
          !error?.message?.toLowerCase().includes('insecure') &&
          !error?.message?.toLowerCase().includes('permission')) {
        // Only log unexpected errors
        console.error('Unexpected copy error:', error)
      }
      // Don't show alert - let user manually select and copy
    }
  }

  const parseMarkdown = (text: string): string => {
    let html = text

    // Code blocks (must be processed first to avoid conflicts)
    html = html.replace(/```([\s\S]*?)```/g, '<pre class="bg-surface1 border border-surface2 rounded-lg p-4 my-4 overflow-x-auto"><code class="text-text font-mono text-sm">$1</code></pre>')
    
    // Inline code
    html = html.replace(/`([^`]+)`/g, '<code class="bg-surface1 px-1 py-0.5 rounded text-sm font-mono">$1</code>')

    // Headers
    html = html.replace(/^### (.*$)/gim, '<h3 class="text-lg font-semibold mt-6 mb-3 text-text">$1</h3>')
    html = html.replace(/^## (.*$)/gim, '<h2 class="text-xl font-semibold mt-6 mb-3 text-text">$1</h2>')
    html = html.replace(/^# (.*$)/gim, '<h1 class="text-2xl font-bold mt-6 mb-4 text-text">$1</h1>')

    // Horizontal rules
    html = html.replace(/^---$/gim, '<hr class="border-surface2 my-6">')
    html = html.replace(/^\*\*\*$/gim, '<hr class="border-surface2 my-6">')

    // Blockquotes
    html = html.replace(/^> (.*$)/gim, '<blockquote class="border-l-4 border-mauve pl-4 py-2 my-4 bg-surface1/50 italic text-subtext1">$1</blockquote>')

    // Tables
    html = html.replace(/\|(.+)\|\n\|[-\s|]+\|\n((?:\|.+\|\n?)*)/g, (match, header, rows) => {
      const headerCells = header.split('|').map((cell: string) => 
        `<th class="border border-surface2 px-3 py-2 bg-surface1 text-left font-semibold">${cell.trim()}</th>`
      ).join('')
      
      const rowLines = rows.trim().split('\n')
      const tableRows = rowLines.map((row: string) => {
        const cells = row.split('|').map((cell: string) => 
          `<td class="border border-surface2 px-3 py-2">${cell.trim()}</td>`
        ).join('')
        return `<tr>${cells}</tr>`
      }).join('')
      
      return `<table class="border-collapse border border-surface2 my-4 w-full"><thead><tr>${headerCells}</tr></thead><tbody>${tableRows}</tbody></table>`
    })

    // Lists (ordered and unordered)
    html = html.replace(/^(\d+\.\s.*(?:\n^  .*)*)/gim, (match) => {
      const items = match.split('\n').map((line: string) => {
        const content = line.replace(/^\d+\.\s/, '').replace(/^  /, '')
        return `<li class="ml-4 my-1">${content}</li>`
      }).join('')
      return `<ol class="list-decimal list-inside my-4 space-y-1">${items}</ol>`
    })

    html = html.replace(/^([-*+]\s.*(?:\n^  .*)*)/gim, (match) => {
      const items = match.split('\n').map((line: string) => {
        const content = line.replace(/^[-*+]\s/, '').replace(/^  /, '')
        return `<li class="ml-4 my-1">${content}</li>`
      }).join('')
      return `<ul class="list-disc list-inside my-4 space-y-1">${items}</ul>`
    })

    // Images
    html = html.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" class="max-w-full h-auto rounded-lg my-4 border border-surface2" />')

    // Links
    html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-blue hover:text-sky underline">$1</a>')

    // Strikethrough
    html = html.replace(/~~(.*?)~~/g, '<del class="line-through text-subtext1">$1</del>')

    // Bold and italic (order matters - bold first)
    html = html.replace(/\*\*\*(.*?)\*\*\*/g, '<strong><em>$1</em></strong>')
    html = html.replace(/\*\*(.*?)\*\*/g, '<strong class="font-bold">$1</strong>')
    html = html.replace(/\*(.*?)\*/g, '<em class="italic">$1</em>')

    // Underline (not standard markdown but useful)
    html = html.replace(/__(.*?)__/g, '<u>$1</u>')

    // Highlight (not standard markdown but useful)
    html = html.replace(/==(.*?)==/g, '<mark class="bg-yellow/20 px-1 rounded">$1</mark>')

    // Line breaks
    html = html.replace(/\n\n/g, '</p><p class="my-2">')
    html = html.replace(/\n/g, '<br>')

    // Wrap in paragraph tags
    html = `<p class="my-2">${html}</p>`

    return html
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-base flex flex-col">
        {/* Top Control Bar */}
        <div className="bg-surface0 border-b border-surface2 px-4 sm:px-6 py-3 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <h1 className="text-xl font-bold text-text">🗝️ KOPY</h1>
            </div>
          </div>
        </div>

        {/* Loading Content */}
        <div className="flex-1 bg-base flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-mauve mx-auto mb-4"></div>
            <h2 className="text-xl font-semibold text-text mb-2">Loading your secure paste...</h2>
            <p className="text-subtext1">Please wait while we decrypt your content.</p>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-surface0 border-t border-surface2 px-4 sm:px-6 py-4 flex-shrink-0">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between text-sm text-overlay1 space-y-2 sm:space-y-0">
            <div className="flex items-center">
              <span>🗝️ KOPY - Because ignorance is bliss</span>
            </div>
            <div className="flex items-center space-x-4">
              <a
                href="https://httpparam.me"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-text transition-colors"
              >
                Made with ❤️ by http.param
              </a>
              <span className="hidden sm:inline">•</span>
              <a
                href="https://github.com/httpparam/kopy"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-text transition-colors"
              >
                Source
              </a>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-base flex flex-col">
        {/* Top Control Bar */}
        <div className="bg-surface0 border-b border-surface2 px-4 sm:px-6 py-3 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <h1 className="text-xl font-bold text-text">🗝️ KOPY</h1>
            </div>
          </div>
        </div>

        {/* Error Content */}
        <div className="flex-1 bg-base flex items-center justify-center">
          <div className="text-center">
            <AlertCircle className="h-12 w-12 text-red mx-auto mb-4" />
            <h2 className="text-2xl font-semibold text-text mb-2">Error</h2>
            <p className="text-subtext1 mb-6">{error}</p>
            <a
              href="/"
              className="btn-primary inline-flex items-center"
            >
              Create New Paste
            </a>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-surface0 border-t border-surface2 px-4 sm:px-6 py-4 flex-shrink-0">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between text-sm text-overlay1 space-y-2 sm:space-y-0">
            <div className="flex items-center">
              <span>🗝️ KOPY - Because ignorance is bliss</span>
            </div>
            <div className="flex items-center space-x-4">
              <a
                href="https://httpparam.me"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-text transition-colors"
              >
                Made with ❤️ by http.param
              </a>
              <span className="hidden sm:inline">•</span>
              <a
                href="https://github.com/httpparam/kopy"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-text transition-colors"
              >
                Source
              </a>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Show password form if paste is password protected and not verified
  if (isPasswordProtected && !isPasswordVerified) {
    return (
      <div className="min-h-screen bg-base flex flex-col">
        {/* Top Control Bar */}
        <div className="bg-surface0 border-b border-surface2 px-4 sm:px-6 py-3 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <h1 className="text-xl font-bold text-text">🗝️ KOPY</h1>
            </div>
          </div>
        </div>

        {/* Password Form Content */}
        <div className="flex-1 bg-base flex items-center justify-center">
          <div className="card max-w-md mx-auto">
            <div className="text-center mb-6">
              <Shield className="h-12 w-12 text-blue mx-auto mb-4" />
              <h1 className="text-2xl font-semibold text-text mb-2">Password Protected</h1>
              <p className="text-subtext1">
                This paste is protected with a password. Please enter the password to view the content.
              </p>
            </div>

            <form onSubmit={handlePasswordSubmit} className="space-y-4">
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-subtext1 mb-2">
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
                  <p className="text-red text-sm mt-1">{passwordError}</p>
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

        {/* Footer */}
        <div className="bg-surface0 border-t border-surface2 px-4 sm:px-6 py-4 flex-shrink-0">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between text-sm text-overlay1 space-y-2 sm:space-y-0">
            <div className="flex items-center">
              <span>🗝️ KOPY - Because ignorance is bliss</span>
            </div>
            <div className="flex items-center space-x-4">
              <a
                href="https://httpparam.me"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-text transition-colors"
              >
                Made with ❤️ by http.param
              </a>
              <span className="hidden sm:inline">•</span>
              <a
                href="https://github.com/httpparam/kopy"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-text transition-colors"
              >
                Source
              </a>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-base flex flex-col">
      {/* Top Control Bar */}
      <div className="bg-surface0 border-b border-surface2 px-4 sm:px-6 py-3 flex-shrink-0">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-3 lg:space-y-0">
          {/* App Name - Always visible */}
          <div className="flex items-center space-x-2">
            <h1 className="text-xl font-bold text-text">🗝️ KOPY</h1>
          </div>
          
          {/* Info and Actions - Stack on mobile */}
          <div className="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-4 lg:space-x-6">
            {/* Author Name */}
            <div className="flex items-center space-x-2">
              <span className="text-subtext1 text-sm whitespace-nowrap">Author:</span>
              <span className="text-text font-medium">
                {paste?.sender_name || 'Anonymous'}
              </span>
            </div>

            {/* Time Left Display */}
            <div className="flex items-center space-x-2">
              <Clock className="h-4 w-4 text-yellow" />
              <span className="text-subtext1 text-sm whitespace-nowrap">Expires:</span>
              <span className="text-yellow font-medium">
                {timeLeft || 'Calculating...'}
              </span>
            </div>

            <button
              onClick={copyContent}
              className="btn-secondary text-sm px-4 flex items-center w-full sm:w-auto justify-center"
            >
              {copied ? (
                <>
                  <Check className="h-4 w-4 mr-2" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4 mr-2" />
                  Copy
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Main Text Area - Full screen height */}
      <div className="flex-1 bg-base flex">
        <div className="flex-1 flex p-2 sm:p-4">
          {paste?.content_type === 'markdown' ? (
            <div 
              className="flex-1 bg-surface0 text-text p-3 sm:p-6 rounded-lg border border-mauve overflow-auto"
              dangerouslySetInnerHTML={{ 
                __html: parseMarkdown(decryptedContent)
              }}
            />
          ) : (
            <textarea
              value={decryptedContent}
              readOnly
              className="flex-1 bg-surface0 text-text p-3 sm:p-6 resize-none focus:outline-none rounded-lg border border-mauve"
            />
          )}
        </div>
      </div>

      {/* Security Notice */}
      <div className="bg-surface0 border-t border-surface2 px-4 sm:px-6 py-4 flex-shrink-0">
        <div className="bg-blue/20 border border-blue rounded-lg p-4">
          <p className="text-sm text-blue">
            <strong>Security Notice:</strong> This content is encrypted and will be automatically deleted when it expires. 
            The decryption key is embedded in the URL and cannot be recovered.
          </p>
        </div>
      </div>

      {/* Footer */}
      <div className="bg-surface0 border-t border-surface2 px-4 sm:px-6 py-4 flex-shrink-0">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between text-sm text-overlay1 space-y-2 sm:space-y-0">
          <div className="flex items-center">
            <span>🗝️ KOPY - Because ignorance is bliss</span>
          </div>
          <div className="flex items-center space-x-4">
            <a
              href="https://httpparam.me"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-text transition-colors"
            >
              Made with ❤️ by http.param
            </a>
            <span className="hidden sm:inline">•</span>
            <a
              href="https://github.com/httpparam/kopy"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-text transition-colors"
            >
              Source
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}
