import type { Metadata, Viewport } from 'next'
import { GeistMono } from 'geist/font/mono'
import './globals.css'

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
        <div className="min-h-screen bg-black sandpaper-texture">
          {children}
        </div>
      </body>
    </html>
  )
}
