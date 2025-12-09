'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { Copy, QrCode, Mail, Check, Eye, Clock, User } from 'lucide-react'
import { decrypt } from '@/lib/encryption'

interface PasteData {
  id: string
  encrypted_content: string
  sender_name?: string
  password_hash?: string
  content_type?: string
  created_at: string
  expires_at: string
}

export default function PreviewPaste() {
  const params = useParams()
  const [paste, setPaste] = useState<PasteData | null>(null)
  const [previewContent, setPreviewContent] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)
  const [showQR, setShowQR] = useState(false)
  const [timeLeft, setTimeLeft] = useState('')
  const [shareUrl, setShareUrl] = useState('')

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
        setShareUrl(`${window.location.origin}/view/${pasteId}#${encodeURIComponent(decryptionKey)}`)

        // Fetch paste data using API route
        const response = await fetch(`/api/paste/${pasteId}`)

        if (!response.ok) {
          if (response.status === 404) {
          setError('Paste not found or expired')
          } else {
            setError('Failed to load paste')
          }
          setIsLoading(false)
          return
        }

        const data = await response.json() as PasteData
        setPaste(data)

        // Decrypt content for preview (full content)
        try {
          const fullContent = await decrypt(data.encrypted_content, decryptionKey)
          setPreviewContent(fullContent)
        } catch (decryptError) {
          setError('Failed to decrypt content')
          setIsLoading(false)
          return
        }

        // Calculate time left
        const expiresAt = new Date(data.expires_at)
        const now = new Date()
        const diffMs = expiresAt.getTime() - now.getTime()
        
        if (diffMs <= 0) {
          setTimeLeft('Expired')
        } else {
          const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
          const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60))
          
          if (diffHours > 0) {
            setTimeLeft(`${diffHours}h ${diffMinutes}m`)
          } else {
            setTimeLeft(`${diffMinutes}m`)
          }
        }

        setIsLoading(false)
      } catch (error) {
        console.error('Error fetching paste:', error)
        setError('Failed to load paste')
        setIsLoading(false)
      }
    }

    fetchPaste()
  }, [params.id])

  const copyToClipboard = async () => {
    try {
      // Try modern Clipboard API first
      if (navigator.clipboard && window.isSecureContext) {
        try {
          await navigator.clipboard.writeText(shareUrl)
          setCopied(true)
          setTimeout(() => setCopied(false), 2000)
          return
        } catch (clipboardError: any) {
          // If clipboard API fails, fall through to fallback
          if (clipboardError?.name !== 'SecurityError' && 
              !clipboardError?.message?.includes('insecure')) {
            console.warn('Clipboard API failed, using fallback:', clipboardError)
          }
        }
      }
      
      // Fallback: Use execCommand only if we're in a context that might support it
      if (document.queryCommandSupported && document.queryCommandSupported('copy')) {
        const textArea = document.createElement('textarea')
        textArea.value = shareUrl
        textArea.style.position = 'fixed'
        textArea.style.left = '-999999px'
        textArea.style.top = '-999999px'
        textArea.setAttribute('readonly', '')
        textArea.style.opacity = '0'
        document.body.appendChild(textArea)
        textArea.focus()
        textArea.select()
        
        try {
          const success = document.execCommand('copy')
          if (success) {
            setCopied(true)
            setTimeout(() => setCopied(false), 2000)
          } else {
            throw new Error('execCommand returned false')
          }
        } catch (err: any) {
          // Silently handle expected security errors
          if (err?.name === 'SecurityError' || 
              err?.name === 'DOMException' ||
              err?.message?.includes('insecure')) {
            console.warn('Copy operation not allowed in this context')
          } else {
            console.error('Fallback copy failed:', err)
          }
          alert('Unable to copy automatically. Please copy manually: ' + shareUrl)
        } finally {
          if (document.body.contains(textArea)) {
            document.body.removeChild(textArea)
          }
        }
      } else {
        alert('Copy is not supported. Please copy manually: ' + shareUrl)
      }
    } catch (error: any) {
      // Catch any other unexpected errors
      if (error?.name !== 'SecurityError' && 
          error?.name !== 'DOMException' &&
          !error?.message?.includes('insecure')) {
        console.error('Unexpected copy error:', error)
      }
      alert('Unable to copy. Please copy manually: ' + shareUrl)
    }
  }

  const generateQRCode = () => {
    setShowQR(!showQR)
  }

  const sendEmail = () => {
    const subject = encodeURIComponent('Secure Paste from KOPY')
    const body = encodeURIComponent(`I've shared a secure paste with you:\n\n${shareUrl}\n\nThe content will be automatically deleted when it expires.`)
    const mailtoLink = `mailto:?subject=${subject}&body=${body}`
    window.open(mailtoLink)
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
            <h2 className="text-xl font-semibold text-text mb-2">Loading preview...</h2>
            <p className="text-subtext1">Please wait while we prepare your paste preview.</p>
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
            {/* Paste Info */}
            <div className="flex flex-col sm:flex-row sm:items-center space-y-1 sm:space-y-0 sm:space-x-4">
              <div className="flex items-center space-x-2">
                <User className="h-4 w-4 text-subtext1" />
                <span className="text-subtext1 text-sm whitespace-nowrap">Author:</span>
                <span className="text-text font-medium">
                  {paste?.sender_name || 'Anonymous'}
                </span>
              </div>

              <div className="flex items-center space-x-2">
                <Clock className="h-4 w-4 text-yellow" />
                <span className="text-subtext1 text-sm whitespace-nowrap">Expires:</span>
                <span className="text-yellow font-medium">{timeLeft}</span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap gap-2">
              <button
                onClick={copyToClipboard}
                className="btn-secondary text-xs px-3 py-1 flex items-center"
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

              <button
                onClick={generateQRCode}
                className="btn-secondary text-xs px-3 py-1 flex items-center"
              >
                <QrCode className="h-3 w-3 mr-1" />
                QR
              </button>

              <button
                onClick={sendEmail}
                className="btn-secondary text-xs px-3 py-1 flex items-center"
              >
                <Mail className="h-3 w-3 mr-1" />
                Email
              </button>

              <a
                href={shareUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-primary text-xs px-3 py-1 flex items-center"
              >
                <Eye className="h-3 w-3 mr-1" />
                View
              </a>

              <a
                href="/"
                className="btn-primary text-xs px-3 py-1"
              >
                New Paste
              </a>
            </div>
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
                __html: parseMarkdown(previewContent)
              }}
            />
          ) : (
            <textarea
              value={previewContent}
              readOnly
              className="flex-1 bg-surface0 text-text p-3 sm:p-6 resize-none focus:outline-none rounded-lg border border-mauve"
            />
          )}
        </div>
      </div>

      {/* QR Code Display */}
      {showQR && (
        <div className="bg-surface0 border-t border-surface2 px-4 sm:px-6 py-4 flex-shrink-0">
          <div className="bg-blue/20 border border-blue rounded-lg p-4 text-center">
            <h3 className="text-lg font-semibold text-blue mb-4">QR Code</h3>
            <div className="bg-white p-4 rounded-lg inline-block">
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(shareUrl)}`}
                alt="QR Code"
                className="mx-auto"
              />
            </div>
            <p className="text-sm text-blue mt-4">
              Scan this QR code to quickly access the paste
            </p>
          </div>
        </div>
      )}

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
