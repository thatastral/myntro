import { ImageResponse } from 'next/og'
import { NextRequest } from 'next/server'

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
          alignItems: 'stretch',
          backgroundColor: '#F7F7F5',
          borderRadius: '20px',
          padding: '10px',
        }}
      >
        {/* Green-tinted outer shell */}
        <div
          style={{
            flex: 1,
            display: 'flex',
            backgroundColor: '#E8F5C8',
            borderRadius: '14px',
            padding: '10px',
            position: 'relative',
          }}
        >
          {/* SVG dashed border */}
          <svg
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
            viewBox="0 0 400 210"
            preserveAspectRatio="none"
          >
            <rect
              x="1"
              y="1"
              width="398"
              height="208"
              rx="12"
              fill="none"
              stroke="#0F1702"
              strokeOpacity="0.12"
              strokeWidth="1.5"
              strokeDasharray="14 12"
            />
          </svg>

          {/* White card face */}
          <div
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              backgroundColor: '#ffffff',
              borderRadius: '10px',
              padding: '18px 22px 12px',
              overflow: 'hidden',
              position: 'relative',
            }}
          >
            {/* "reserved!" pill */}
            <div
              style={{
                display: 'flex',
                alignSelf: 'flex-start',
                backgroundColor: '#D0ED99',
                borderRadius: '999px',
                padding: '4px 12px',
              }}
            >
              <span
                style={{
                  fontFamily: '"Funnel Display"',
                  fontSize: '11px',
                  fontWeight: 700,
                  color: '#3A6B00',
                  textTransform: 'uppercase',
                  letterSpacing: '0.1em',
                }}
              >
                reserved!
              </span>
            </div>

            {/* URL + checkmark row */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'row',
                alignItems: 'center',
                marginTop: '14px',
                gap: '8px',
              }}
            >
              <div style={{ display: 'flex', flex: 1, alignItems: 'baseline' }}>
                <span
                  style={{
                    fontFamily: '"Funnel Display"',
                    fontSize: '28px',
                    fontWeight: 700,
                    color: 'rgba(15,23,2,0.35)',
                    letterSpacing: '-0.5px',
                    lineHeight: 1,
                  }}
                >
                  myntro.me/
                </span>
                <span
                  style={{
                    fontFamily: '"Funnel Display"',
                    fontSize: '28px',
                    fontWeight: 700,
                    color: '#0F1702',
                    letterSpacing: '-0.5px',
                    lineHeight: 1,
                  }}
                >
                  {username}
                </span>
              </div>

              {/* Checkmark circle */}
              <div
                style={{
                  display: 'flex',
                  width: '30px',
                  height: '30px',
                  borderRadius: '50%',
                  backgroundColor: '#8EE600',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path
                    d="M3 8L6.5 11.5L13 5"
                    stroke="white"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
            </div>

            {/* Myntro watermark */}
            <div
              style={{
                display: 'flex',
                marginTop: '10px',
                justifyContent: 'center',
                overflow: 'hidden',
              }}
            >
              <span
                style={{
                  fontFamily: '"Funnel Display"',
                  fontSize: '72px',
                  fontWeight: 700,
                  color: '#0F1702',
                  opacity: 0.07,
                  letterSpacing: '0.15em',
                  lineHeight: 1,
                }}
              >
                MYNTRO
              </span>
            </div>
          </div>
        </div>
      </div>
    ),
    {
      width: 440,
      height: 250,
      fonts: [{ name: 'Funnel Display', data: fontData, weight: 700, style: 'normal' }],
    },
  )
}
