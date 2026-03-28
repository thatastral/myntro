/**
 * WaitlistCardInner — shared card content used by both:
 *  - app/waitlist/page.tsx (browser, inside the 3D tilt wrapper)
 *  - app/api/email/card/route.tsx (ImageResponse / Satori)
 *
 * Inline styles only — no Tailwind, no CSS variables — required for Satori compatibility.
 * Uses "Funnel Display" by name (next/font/google loads it globally in the browser).
 */
export function WaitlistCardInner({ username }: { username: string }) {
  return (
    <>
      {/* SVG dashed border — absolute, fills parent */}
      <svg
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
        viewBox="0 0 401 228"
        fill="none"
        preserveAspectRatio="xMidYMid meet"
        aria-hidden="true"
      >
        <rect
          x="10.75" y="10.75"
          width="379.5" height="206.5"
          rx="14"
          stroke="#0F1702"
          strokeOpacity="0.08"
          strokeDasharray="16 16"
          strokeWidth="1.5"
        />
      </svg>

      {/* Content column */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          paddingTop: '19%',
        }}
      >
        {/* "reserved!" pill */}
        <span
          style={{
            background: '#D0ED99',
            color: '#0F1702',
            borderRadius: '999px',
            padding: '4px 14px',
            fontSize: '11px',
            fontWeight: 600,
            fontFamily: '"Funnel Display", sans-serif',
            lineHeight: 1.4,
          }}
        >
          reserved!
        </span>

        {/* URL + squircle badge row */}
        <div style={{ display: 'flex', alignItems: 'center', marginTop: 14, gap: 6 }}>
          <span
            style={{
              fontFamily: '"Funnel Display", sans-serif',
              fontSize: '32px',
              letterSpacing: '-0.5px',
              lineHeight: 1,
            }}
          >
            <span style={{ color: '#0F1702', opacity: 0.38 }}>myntro.me/</span>
            <span style={{ color: '#0F1702', fontWeight: 700 }}>{username}</span>
          </span>

          {/* Squircle badge — exact paths from waitlist success screen */}
          <svg
            width="34"
            height="34"
            viewBox="313 79.5 33 32"
            fill="none"
            aria-hidden="true"
            style={{ flexShrink: 0 }}
          >
            <defs>
              <linearGradient id="badgeSg" x1="329.5" y1="71.4628" x2="329.5" y2="116.115" gradientUnits="userSpaceOnUse">
                <stop stopColor="white" />
                <stop offset="1" stopColor="#8EE600" />
              </linearGradient>
            </defs>
            <path d="M326.361 83.0398C327.987 81.0638 331.013 81.0638 332.639 83.0398V83.0398C333.499 84.0851 334.823 84.6336 336.171 84.5028V84.5028C338.718 84.2554 340.857 86.3948 340.61 88.9419V88.9419C340.479 90.2894 341.028 91.6136 342.073 92.4738V92.4738C344.049 94.1 344.049 97.1256 342.073 98.7517V98.7517C341.028 99.612 340.479 100.936 340.61 102.284V102.284C340.857 104.831 338.718 106.97 336.171 106.723V106.723C334.823 106.592 333.499 107.14 332.639 108.186V108.186C331.013 110.162 327.987 110.162 326.361 108.186V108.186C325.501 107.14 324.177 106.592 322.829 106.723V106.723C320.282 106.97 318.143 104.831 318.39 102.284V102.284C318.521 100.936 317.972 99.612 316.927 98.7517V98.7517C314.951 97.1256 314.951 94.1 316.927 92.4738V92.4738C317.972 91.6136 318.521 90.2894 318.39 88.9419V88.9419C318.143 86.3948 320.282 84.2554 322.829 84.5028V84.5028C324.177 84.6336 325.501 84.0851 326.361 83.0398V83.0398Z" fill="url(#badgeSg)" />
            <path d="M326.748 83.3574C328.174 81.6248 330.826 81.6248 332.252 83.3574C333.219 84.5313 334.706 85.147 336.219 85C338.453 84.7831 340.33 86.6598 340.113 88.8936C339.966 90.4067 340.581 91.8943 341.755 92.8604C343.488 94.2865 343.488 96.9391 341.755 98.3652C340.581 99.3313 339.966 100.819 340.113 102.332C340.33 104.566 338.453 106.442 336.219 106.226C334.706 106.079 333.219 106.694 332.252 107.868C330.826 109.601 328.174 109.601 326.748 107.868C325.781 106.694 324.294 106.079 322.781 106.226C320.547 106.442 318.67 104.566 318.887 102.332C319.034 100.819 318.419 99.3313 317.245 98.3652C315.512 96.9391 315.512 94.2865 317.245 92.8604C318.419 91.8943 319.034 90.4067 318.887 88.8936C318.67 86.6598 320.547 84.7831 322.781 85C324.294 85.147 325.781 84.5313 326.748 83.3574Z" stroke="#0F1702" strokeOpacity="0.02" />
            <path fillRule="evenodd" clipRule="evenodd" d="M334.886 92.1682C335.027 92.3088 335.106 92.4996 335.106 92.6985C335.106 92.8973 335.027 93.0881 334.886 93.2287L329.265 98.8502C329.191 98.9245 329.102 98.9835 329.005 99.0237C328.908 99.0639 328.804 99.0846 328.699 99.0846C328.594 99.0846 328.49 99.0639 328.393 99.0237C328.296 98.9835 328.208 98.9245 328.133 98.8502L325.34 96.0577C325.269 95.9885 325.212 95.9058 325.172 95.8143C325.133 95.7228 325.112 95.6243 325.111 95.5248C325.11 95.4252 325.129 95.3264 325.167 95.2342C325.205 95.1421 325.261 95.0583 325.331 94.9879C325.401 94.9175 325.485 94.8618 325.577 94.8241C325.67 94.7864 325.768 94.7674 325.868 94.7683C325.967 94.7691 326.066 94.7898 326.157 94.8291C326.249 94.8684 326.332 94.9256 326.401 94.9972L328.699 97.2952L333.825 92.1682C333.895 92.0985 333.978 92.0432 334.069 92.0055C334.16 91.9678 334.257 91.9484 334.356 91.9484C334.454 91.9484 334.552 91.9678 334.643 92.0055C334.734 92.0432 334.817 92.0985 334.886 92.1682Z" fill="white" />
          </svg>
        </div>

        {/* Myntro watermark */}
        <div
          aria-hidden="true"
          style={{
            overflow: 'hidden',
            alignSelf: 'stretch',
            marginTop: 16,
            display: 'flex',
            justifyContent: 'center',
          }}
        >
          <span
            style={{
              fontFamily: '"Funnel Display", sans-serif',
              fontSize: '155px',
              fontWeight: 700,
              color: '#0F1702',
              opacity: 0.12,
              lineHeight: 0.85,
              display: 'block',
              textAlign: 'center',
              letterSpacing: '-2px',
            }}
          >
            Myntro
          </span>
        </div>
      </div>
    </>
  )
}
