import { ImageResponse } from 'next/og';

export const contentType = 'image/png';

export const size = {
  width: 512,
  height: 512
};

export default function Icon() {
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
            'radial-gradient(circle at 20% 20%, rgba(106,182,255,0.35), transparent 30%), radial-gradient(circle at 84% 14%, rgba(242,191,110,0.3), transparent 24%), linear-gradient(160deg, #09111d 0%, #0f1b31 46%, #05070d 100%)'
        }}
      >
        <div
          style={{
            width: 360,
            height: 360,
            borderRadius: 96,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: '12px solid rgba(255,255,255,0.08)',
            background: 'linear-gradient(160deg, rgba(106,182,255,0.22), rgba(242,191,110,0.18))',
            boxShadow: '0 30px 80px rgba(0,0,0,0.35)'
          }}
        >
          <div
            style={{
              fontSize: 220,
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
