import type { Metadata } from 'next'

const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://myntro.me'

export const metadata: Metadata = {
  title: 'Claim your Myntro username — Reserve your spot',
  description: 'Reserve your unique Myntro handle before the public launch. Build your creator identity with verified affiliations, achievements, and an AI assistant. First come, first served.',
  openGraph: {
    title: 'Claim your Myntro username — Reserve your spot',
    description: 'Reserve your unique Myntro handle before the public launch. Build your creator identity with verified affiliations, achievements, and an AI assistant. First come, first served.',
    images: [{ url: `${baseUrl}/og-waitlist.png`, width: 1200, height: 630, alt: 'Myntro — Claim your username' }],
    url: `${baseUrl}/waitlist`,
    type: 'website',
    siteName: 'Myntro',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Claim your Myntro username — Reserve your spot',
    description: 'Reserve your unique Myntro handle before the public launch. First come, first served.',
    images: [`${baseUrl}/og-waitlist.png`],
  },
}

export default function WaitlistLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
