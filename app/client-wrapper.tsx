'use client'

import { useEffect } from 'react'

export function ClientWrapper({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Global error handlers
    const handleError = (event: ErrorEvent) => {
      // Check for security errors
      if (event.error?.name === 'SecurityError' || 
          event.error?.name === 'DOMException' || 
          event.message?.includes('insecure') ||
          event.message?.includes('SecurityError')) {
        console.error('Security Error Details:', {
          message: event.message,
          error: event.error,
          stack: event.error?.stack,
          type: event.type,
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno
        })
      }
      console.error('Global error:', event.error)
    }
    
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      // Check for security errors in promises
      const reason = event.reason
      if (reason?.name === 'SecurityError' || 
          reason?.name === 'DOMException' || 
          reason?.message?.includes('insecure') ||
          reason?.toString().includes('SecurityError')) {
        console.error('Security Error (Promise) Details:', {
          reason: reason,
          stack: reason?.stack,
          message: reason?.message || reason?.toString()
        })
      }
      console.error('Unhandled promise rejection:', event.reason)
    }
    
    window.addEventListener('error', handleError, true) // Use capture phase
    window.addEventListener('unhandledrejection', handleUnhandledRejection)
    
    return () => {
      window.removeEventListener('error', handleError, true)
      window.removeEventListener('unhandledrejection', handleUnhandledRejection)
    }
  }, [])
  
  return <>{children}</>
}

