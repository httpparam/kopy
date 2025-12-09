'use client'

import { useEffect } from 'react'

export function ClientWrapper({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Global error handlers
    const handleError = (event: ErrorEvent) => {
      console.error('Global error:', event.error)
    }
    
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      console.error('Unhandled promise rejection:', event.reason)
    }
    
    window.addEventListener('error', handleError)
    window.addEventListener('unhandledrejection', handleUnhandledRejection)
    
    return () => {
      window.removeEventListener('error', handleError)
      window.removeEventListener('unhandledrejection', handleUnhandledRejection)
    }
  }, [])
  
  return <>{children}</>
}

