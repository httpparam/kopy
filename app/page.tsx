'use client'

import { useState, useEffect } from 'react'
import { Lock, Copy, Check, Clock, Shield, Eye, QrCode, Mail } from 'lucide-react'
// Encryption is handled server-side via API route

export default function Home() {
  const [content, setContent] = useState('')
  const [senderName, setSenderName] = useState('')
  const [password, setPassword] = useState('')
  const [expirationMinutes, setExpirationMinutes] = useState(10) // Default to 10 minutes
  const [isLoading, setIsLoading] = useState(false)
  const [shareUrl, setShareUrl] = useState('')
  const [copied, setCopied] = useState(false)
  const [connectionStatus, setConnectionStatus] = useState<'checking' | 'connected' | 'error'>('checking')
  const [showPreview, setShowPreview] = useState(false)
  const [showQR, setShowQR] = useState(false)
  const [previewContent, setPreviewContent] = useState('')
  const [contentType, setContentType] = useState<'text' | 'markdown'>('text')
  const [viewMode, setViewMode] = useState<'edit' | 'preview'>('edit')

  // Test database connection on component mount
  useEffect(() => {
    const testConnection = async () => {
      try {
        const response = await fetch('/api/health')
        if (response.ok) {
        setConnectionStatus('connected')
        } else {
          throw new Error('Connection test failed')
        }
      } catch (error) {
        console.error('Database connection test failed:', error)
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
      // Store in database via API route (encryption happens on server)
      const formData = new FormData()
      formData.append('content', content)
      formData.append('senderName', senderName)
      formData.append('password', password)
      formData.append('expirationMinutes', expirationMinutes.toString())
      formData.append('contentType', contentType)

      const response = await fetch('/api/post', {
        method: 'POST',
        body: formData
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to create paste')
      }

      const result = await response.json()
      
      // Use the URL returned from the API
      setShareUrl(result.url)
      
      // Show preview with current content
      setPreviewContent(content)
      setShowPreview(true)
      
      // Clear the form
      setContent('')
      setSenderName('')
      setPassword('')
      setExpirationMinutes(10) // Reset to default
    } catch (error) {
      console.error('Error creating paste:', error)
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
      alert(`Failed to create paste: ${errorMessage}\n\nPlease check:\n1. Your database credentials in .env.local\n2. Database schema is set up correctly\n3. Network connection`)
    } finally {
      setIsLoading(false)
    }
  }

  const copyToClipboard = async () => {
    try {
      // Try modern Clipboard API first
      try {
        if (navigator.clipboard && window.isSecureContext) {
          try {
            await navigator.clipboard.writeText(shareUrl)
            setCopied(true)
            setTimeout(() => setCopied(false), 2000)
            return
          } catch (clipboardError: any) {
            // If clipboard API fails, fall through to fallback
            console.warn('Clipboard API failed, trying fallback method')
          }
        }
      } catch (e) {
        // Ignore errors checking for clipboard existence (e.g. insecure context)
      }
      
      // Fallback: Use deprecated execCommand
      // Note: This is deprecated but still works in most browsers as a fallback
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
          throw new Error('Copy command failed')
        }
      } catch (err: any) {
        console.warn('Copy operation failed:', err)
        alert('Unable to copy automatically. Please copy manually: ' + shareUrl)
      } finally {
        if (document.body.contains(textArea)) {
          document.body.removeChild(textArea)
        }
      }
    } catch (error: any) {
      console.error('Unexpected copy error:', error)
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

  const createNewPaste = () => {
    setShowPreview(false)
    setShowQR(false)
    setShareUrl('')
    setPreviewContent('')
    setViewMode('edit')
    setContentType('text')
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

  return (
    <div className="min-h-screen bg-base flex flex-col">
      {/* Top Control Bar */}
      <div className="bg-surface0 border-b border-surface2 px-4 sm:px-6 py-3 flex-shrink-0">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-3 lg:space-y-0">
          {/* App Name - Always visible */}
          <div className="flex items-center space-x-2">
            <h1 className="text-xl font-bold text-text">🗝️ KOPY</h1>
          </div>
          
          {/* Controls - Stack on mobile, row on desktop */}
          <div className="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-4 lg:space-x-6">
            {/* Author Name */}
            <div className="flex items-center space-x-2">
              <input
                type="text"
                value={senderName}
                onChange={(e) => setSenderName(e.target.value)}
                placeholder="Author (optional)"
                className="input-field text-sm w-full sm:w-32"
              />
            </div>

            {/* Time Dropdown */}
            <div className="flex items-center space-x-2">
              <span className="text-subtext1 text-sm whitespace-nowrap">Expires:</span>
              <select
                value={expirationMinutes}
                onChange={(e) => setExpirationMinutes(Number(e.target.value))}
                className="input-field text-sm w-full sm:w-auto"
              >
                <option value={10}>10 minutes</option>
                <option value={60}>1 hour</option>
                <option value={1440}>1 day</option>
                <option value={4320}>3 days</option>
                <option value={10080}>1 week</option>
              </select>
            </div>

            {/* Password */}
            <div className="flex items-center space-x-2">
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password (optional)"
                className="input-field text-sm w-full sm:w-32"
              />
            </div>

            {/* Content Type */}
            <div className="flex items-center space-x-2">
              <span className="text-subtext1 text-sm whitespace-nowrap">Type:</span>
              <select
                value={contentType}
                onChange={(e) => setContentType(e.target.value as 'text' | 'markdown')}
                className="input-field text-sm w-full sm:w-auto"
              >
                <option value="text">Plain Text</option>
                <option value="markdown">Markdown</option>
              </select>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-2">
            {showPreview ? (
              <>
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

                  <button
                    onClick={createNewPaste}
                    className="btn-primary text-xs px-3 py-1"
                  >
                    New Paste
                  </button>
                </div>
              </>
            ) : (
              <button
                type="submit"
                form="paste-form"
                disabled={isLoading || !content.trim()}
                className="btn-primary text-sm px-6 w-full sm:w-auto"
              >
                {isLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2 inline-block"></div>
                    Creating...
                  </>
                ) : (
                  'Create'
                )}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Connection Status */}
      {connectionStatus === 'checking' && (
        <div className="bg-yellow/20 border-b border-yellow px-4 sm:px-6 py-2">
          <div className="flex items-center">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-yellow mr-2"></div>
            <span className="text-yellow text-sm">Checking connection...</span>
          </div>
        </div>
      )}
      {connectionStatus === 'connected' && (
        <div className="bg-green/20 border-b border-green px-4 sm:px-6 py-2">
          <div className="flex items-center">
            <div className="w-2 h-2 bg-green rounded-full mr-2"></div>
            <span className="text-green text-sm">Connected to database</span>
          </div>
        </div>
      )}
      {connectionStatus === 'error' && (
        <div className="bg-red/20 border-b border-red px-4 sm:px-6 py-2">
          <div className="flex items-center">
            <div className="w-2 h-2 bg-red rounded-full mr-2"></div>
            <span className="text-red text-sm">Database connection failed</span>
          </div>
        </div>
      )}

 {/* View Mode Tabs */}
 {!showPreview && (
   <div className="bg-surface0 border-b border-surface2 px-4 sm:px-6 py-2 flex-shrink-0">
     <div className="flex items-center">
       <div className="flex items-center space-x-1">
         <button
           onClick={() => setViewMode('edit')}
           className={`px-3 sm:px-4 py-2 text-sm rounded-full transition-colors ${
             viewMode === 'edit' 
               ? 'bg-mauve text-base' 
               : 'bg-transparent text-subtext1 hover:text-text border border-surface2'
           }`}
         >
           Edit
         </button>
         <button
           onClick={() => setViewMode('preview')}
           className={`px-3 sm:px-4 py-2 text-sm rounded-full transition-colors ${
             viewMode === 'preview' 
               ? 'bg-mauve text-base' 
               : 'bg-transparent text-subtext1 hover:text-text border border-surface2'
           }`}
         >
           Preview
         </button>
       </div>
     </div>
   </div>
 )}

 {/* Main Text Area - Full screen height */}
 <div className="flex-1 bg-base flex">
   {showPreview ? (
     <div className="flex-1 flex p-2 sm:p-4">
       {contentType === 'markdown' ? (
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
   ) : (
     <form id="paste-form" onSubmit={handleSubmit} className="flex-1 flex p-2 sm:p-4">
       {viewMode === 'edit' ? (
         <textarea
           id="content"
           value={content}
           onChange={(e) => setContent(e.target.value)}
           placeholder="Paste your text here..."
           className="flex-1 bg-surface0 text-text p-3 sm:p-6 resize-none focus:outline-none placeholder-overlay1 rounded-lg border border-mauve"
           required
         />
       ) : (
         <div className="flex-1 bg-surface0 text-text p-3 sm:p-6 rounded-lg border border-mauve overflow-auto">
           {contentType === 'markdown' ? (
             <div 
               className="prose prose-invert max-w-none"
               dangerouslySetInnerHTML={{ 
                 __html: parseMarkdown(content)
               }}
             />
           ) : (
             <pre className="whitespace-pre-wrap font-mono text-sm">{content}</pre>
           )}
         </div>
       )}
     </form>
   )}
 </div>



      {/* Success Message */}
      {shareUrl && !showPreview && (
        <div className="bg-surface0 border-t border-surface2 p-4 sm:p-6 flex-shrink-0">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center">
              <Check className="h-5 w-5 text-green mr-2" />
              <span className="text-green font-medium">Paste created successfully!</span>
            </div>
          </div>
          <div className="p-3 bg-surface1 rounded text-sm text-text font-mono break-all border border-surface2">
            {shareUrl}
          </div>
          <p className="text-xs text-overlay1 mt-2">
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

      {/* QR Code Display */}
      {showQR && showPreview && (
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
              Made with 🩵 by http.param
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
