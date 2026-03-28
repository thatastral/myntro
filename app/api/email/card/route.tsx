import { ImageResponse } from 'next/og'
import { NextRequest } from 'next/server'
import { WaitlistCardInner } from '@/components/waitlist/WaitlistCardInner'

export const runtime = 'edge'

const FONT_URL =
  'https://fonts.gstatic.com/s/funneldisplay/v3/B50bF7FGv37QNVWgE0ga--4PbZSRJXrOHcLHLoAYfWTXWA.ttf'

export async function GET(request: NextRequest) {
  const username = new URL(request.url).searchParams.get('username') ?? 'username'

  const fontData = await fetch(FONT_URL).then((r) => r.arrayBuffer())

  return new ImageResponse(
    (
      <div
        style={{
          width: '440px',
          height: '250px',
          display: 'flex',
          position: 'relative',
          backgroundColor: '#ffffff',
          borderRadius: '26px',
          overflow: 'hidden',
        }}
      >
        <WaitlistCardInner username={username} />
      </div>
    ),
    {
      width: 440,
      height: 250,
      fonts: [{ name: 'Funnel Display', data: fontData, weight: 700, style: 'normal' }],
    },
  )
}
