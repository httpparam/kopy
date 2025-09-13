import type { Metadata } from 'next'
import { GeistMono } from 'geist/font/mono'
import './globals.css'

export const metadata: Metadata = {
  title: 'Kopy',
  description: 'Private encrypted pastebin',
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
