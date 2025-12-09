'use client'

import { Component, ReactNode } from 'react'
import { AlertCircle } from 'lucide-react'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error?: Error
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
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
              <h2 className="text-2xl font-semibold text-text mb-2">Something went wrong</h2>
              <p className="text-subtext1 mb-6">
                {this.state.error?.message || 'An unexpected error occurred'}
              </p>
              <button
                onClick={() => {
                  this.setState({ hasError: false, error: undefined })
                  if (typeof window !== 'undefined') {
                    window.location.href = '/'
                  }
                }}
                className="btn-primary inline-flex items-center"
              >
                Go Home
              </button>
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

    return this.props.children
  }
}

