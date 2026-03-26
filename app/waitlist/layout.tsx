import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Claim your Myntro username',
  description: 'Reserve your unique Myntro handle before the public launch. First come, first served.',
  openGraph: {
    title: 'Claim your Myntro username',
    description: 'Reserve your unique Myntro handle before the public launch. First come, first served.',
    images: [{ url: '/og-waitlist.png', width: 1200, height: 630 }],
    url: 'https://myntro.me/waitlist',
    type: 'website',
    siteName: 'Myntro',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Claim your Myntro username',
    description: 'Reserve your unique Myntro handle before the public launch.',
    images: ['/og-waitlist.png'],
  },
}

export default function WaitlistLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
