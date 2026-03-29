import { ImageResponse } from 'next/og';

export const contentType = 'image/png';

export const size = {
  width: 180,
  height: 180
};

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background:
            'radial-gradient(circle at 24% 18%, rgba(106,182,255,0.38), transparent 28%), radial-gradient(circle at 82% 12%, rgba(242,191,110,0.34), transparent 22%), linear-gradient(160deg, #0b1424 0%, #10203a 48%, #060912 100%)'
        }}
      >
        <div
          style={{
            width: 128,
            height: 128,
            borderRadius: 34,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: '4px solid rgba(255,255,255,0.08)',
            background: 'linear-gradient(160deg, rgba(106,182,255,0.24), rgba(242,191,110,0.2))'
          }}
        >
          <div
            style={{
              fontSize: 78,
              fontWeight: 800,
              letterSpacing: '-0.08em',
              color: '#f4f1ea',
              fontFamily: 'Arial'
            }}
          >
            A
          </div>
        </div>
      </div>
    ),
    size
  );
}
