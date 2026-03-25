import type { Metadata } from 'next'
import { Inter, Geist_Mono } from 'next/font/google'
import { Architects_Daughter } from 'next/font/google'
import { Space_Grotesk } from 'next/font/google'
import './globals.css'
import { ThemeProvider } from '@/components/ThemeProvider'

const inter = Inter({
  variable: '--font-sans',
  subsets: ['latin'],
  display: 'swap',
})

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
  display: 'swap',
})

const architectsDaughter = Architects_Daughter({
  variable: '--font-architects-daughter',
  weight: '400',
  subsets: ['latin'],
  display: 'swap',
})

const spaceGrotesk = Space_Grotesk({
  variable: '--font-clash-grotesk',
  subsets: ['latin'],
  display: 'swap',
})

export const metadata: Metadata = {
  title: {
    default: 'Myntro — Web3 Personal Pages',
    template: '%s | Myntro',
  },
  description:
    'Web3-native personal pages with AI-powered identity. Share your links, achievements, and affiliations. Accept tips via Solana.',
  keywords: ['web3', 'personal page', 'solana', 'crypto', 'identity', 'AI'],
  authors: [{ name: 'Myntro' }],
  openGraph: {
    type: 'website',
    siteName: 'Myntro',
    title: 'Myntro — Web3 Personal Pages',
    description:
      'Web3-native personal pages with AI-powered identity. Share your links, achievements, and affiliations.',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Myntro — Web3 Personal Pages',
    description: 'Web3-native personal pages with AI-powered identity.',
  },
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000',
  ),
}

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${inter.variable} ${geistMono.variable} ${architectsDaughter.variable} ${spaceGrotesk.variable} font-sans antialiased`}
      >
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  )
}
