'use client'

import { useEffect } from 'react'

export function ClientWrapper({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Global error handlers
    const handleError = (event: ErrorEvent) => {
      // Filter out expected security errors from clipboard operations
      if (event.error?.name === 'DOMException' && 
          (event.error?.message?.includes('insecure') || 
           event.error?.message?.includes('The operation is insecure'))) {
        // Silently ignore expected clipboard security errors
        event.preventDefault()
        return
      }
      console.error('Global error:', event.error)
    }
    
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      // Filter out expected security errors
      if (event.reason?.name === 'DOMException' && 
          (event.reason?.message?.includes('insecure') || 
           event.reason?.message?.includes('The operation is insecure'))) {
        event.preventDefault()
        return
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

