import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Rivera',
  description: 'Real estate partner management platform',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  )
}
