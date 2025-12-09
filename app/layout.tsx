import type { Metadata, Viewport } from 'next'
import { GeistMono } from 'geist/font/mono'
import './globals.css'
import { ErrorBoundary } from './error-boundary'
import { ClientWrapper } from './client-wrapper'

export const metadata: Metadata = {
  title: 'Kopy',
  description: 'Private encrypted pastebin',
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={GeistMono.className}>
        <ErrorBoundary>
          <ClientWrapper>
            <div className="min-h-screen bg-black sandpaper-texture">
              {children}
            </div>
          </ClientWrapper>
        </ErrorBoundary>
      </body>
    </html>
  )
}
