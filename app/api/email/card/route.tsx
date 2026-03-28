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
          flexDirection: 'column',
          alignItems: 'center',
          position: 'relative',
          backgroundColor: '#ffffff',
          borderRadius: '26px',
          overflow: 'hidden',
          paddingTop: '48px',
        }}
      >
        {/* SVG dashed border — inset from card edge */}
        <svg
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
          viewBox="0 0 440 250"
          fill="none"
        >
          <rect
            x="11.5"
            y="11.5"
            width="417"
            height="227"
            rx="15"
            fill="none"
            stroke="#0F1702"
            strokeOpacity="0.08"
            strokeWidth="1.5"
            strokeDasharray="16 16"
          />
        </svg>

        {/* "reserved!" pill */}
        <div
          style={{
            display: 'flex',
            backgroundColor: '#D0ED99',
            borderRadius: '999px',
            padding: '4px 14px',
          }}
        >
          <span
            style={{
              fontFamily: '"Funnel Display"',
              fontSize: '11px',
              fontWeight: 700,
              color: '#0F1702',
              letterSpacing: '0.06em',
            }}
          >
            reserved!
          </span>
        </div>

        {/* URL + squircle badge row */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'center',
            marginTop: '14px',
            gap: '8px',
          }}
        >
          <span
            style={{
              fontFamily: '"Funnel Display"',
              fontSize: '30px',
              fontWeight: 700,
              color: 'rgba(15,23,2,0.38)',
              letterSpacing: '-0.5px',
              lineHeight: 1,
            }}
          >
            myntro.me/
          </span>
          <span
            style={{
              fontFamily: '"Funnel Display"',
              fontSize: '30px',
              fontWeight: 700,
              color: '#0F1702',
              letterSpacing: '-0.5px',
              lineHeight: 1,
            }}
          >
            {username}
          </span>

          {/* Squircle badge — exact paths from waitlist/page.tsx */}
          <svg width="37" height="37" viewBox="313 79.5 33 32" fill="none" style={{ flexShrink: 0 }}>
            <defs>
              <linearGradient id="sg" x1="329.5" y1="71.5" x2="329.5" y2="116.1" gradientUnits="userSpaceOnUse">
                <stop stopColor="white" />
                <stop offset="1" stopColor="#8EE600" />
              </linearGradient>
            </defs>
            {/* Squircle fill */}
            <path
              d="M326.361 83.04C327.987 81.064 331.013 81.064 332.639 83.04C333.499 84.085 334.823 84.634 336.171 84.503C338.718 84.255 340.857 86.395 340.61 88.942C340.479 90.289 341.028 91.614 342.073 92.474C344.049 94.1 344.049 97.126 342.073 98.752C341.028 99.612 340.479 100.936 340.61 102.284C340.857 104.831 338.718 106.97 336.171 106.723C334.823 106.592 333.499 107.14 332.639 108.186C331.013 110.162 327.987 110.162 326.361 108.186C325.501 107.14 324.177 106.592 322.829 106.723C320.282 106.97 318.143 104.831 318.39 102.284C318.521 100.936 317.972 99.612 316.927 98.752C314.951 97.126 314.951 94.1 316.927 92.474C317.972 91.614 318.521 90.289 318.39 88.942C318.143 86.395 320.282 84.255 322.829 84.503C324.177 84.634 325.501 84.085 326.361 83.04Z"
              fill="url(#sg)"
            />
            {/* Squircle border */}
            <path
              d="M326.748 83.357C328.174 81.625 330.826 81.625 332.252 83.357C333.219 84.531 334.706 85.147 336.219 85C338.453 84.783 340.33 86.66 340.113 88.894C339.966 90.407 340.581 91.894 341.755 92.86C343.488 94.287 343.488 96.939 341.755 98.365C340.581 99.331 339.966 100.819 340.113 102.332C340.33 104.566 338.453 106.442 336.219 106.226C334.706 106.079 333.219 106.694 332.252 107.868C330.826 109.601 328.174 109.601 326.748 107.868C325.781 106.694 324.294 106.079 322.781 106.226C320.547 106.442 318.67 104.566 318.887 102.332C319.034 100.819 318.419 99.331 317.245 98.365C315.512 96.939 315.512 94.287 317.245 92.86C318.419 91.894 319.034 90.407 318.887 88.894C318.67 86.66 320.547 84.783 322.781 85C324.294 85.147 325.781 84.531 326.748 83.357Z"
              stroke="#0F1702"
              strokeOpacity="0.02"
            />
            {/* Checkmark */}
            <path
              fillRule="evenodd"
              clipRule="evenodd"
              d="M334.886 92.168C335.027 92.309 335.106 92.5 335.106 92.699C335.106 92.897 335.027 93.088 334.886 93.229L329.265 98.85C329.191 98.925 329.102 98.984 329.005 99.024C328.908 99.064 328.804 99.085 328.699 99.085C328.594 99.085 328.49 99.064 328.393 99.024C328.296 98.984 328.208 98.925 328.133 98.85L325.34 96.058C325.269 95.989 325.212 95.906 325.172 95.814C325.133 95.723 325.112 95.624 325.111 95.525C325.11 95.425 325.129 95.326 325.167 95.234C325.205 95.142 325.261 95.058 325.331 94.988C325.401 94.918 325.485 94.862 325.577 94.824C325.67 94.786 325.768 94.767 325.868 94.768C325.967 94.769 326.066 94.79 326.157 94.829C326.249 94.868 326.332 94.926 326.401 94.997L328.699 97.295L333.825 92.168C333.895 92.099 333.978 92.043 334.069 92.006C334.16 91.968 334.257 91.948 334.356 91.948C334.454 91.948 334.552 91.968 334.643 92.006C334.734 92.043 334.817 92.099 334.886 92.168Z"
              fill="white"
            />
          </svg>
        </div>

        {/* Watermark — "Myntro" mixed case, faded */}
        <div
          style={{
            display: 'flex',
            overflow: 'hidden',
            alignSelf: 'stretch',
            marginTop: '14px',
            justifyContent: 'center',
          }}
        >
          <span
            style={{
              fontFamily: '"Funnel Display"',
              fontSize: '170px',
              fontWeight: 700,
              color: '#0F1702',
              opacity: 0.12,
              lineHeight: 0.85,
              letterSpacing: '-2px',
            }}
          >
            Myntro
          </span>
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
