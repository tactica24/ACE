'use client';

import { useEffect, useState } from 'react';

type MovieAccessDetailsProps = {
  videoId: string;
  title: string;
  details: string[];
  priceLabel: string;
  initiallyUnlocked: boolean;
  unitLabel?: string;
};

export default function MovieAccessDetails({
  videoId,
  title,
  details,
  priceLabel,
  initiallyUnlocked,
  unitLabel = 'title'
}: MovieAccessDetailsProps) {
  const [unlocked, setUnlocked] = useState(initiallyUnlocked);

  useEffect(() => {
    const handleUnlocked = (event: Event) => {
      const customEvent = event as CustomEvent<{ videoId?: string }>;
      if (customEvent.detail?.videoId === videoId) {
        setUnlocked(true);
      }
    };

    window.addEventListener('ace:video-unlocked', handleUnlocked);
    return () => window.removeEventListener('ace:video-unlocked', handleUnlocked);
  }, [videoId]);

  return (
    <div className="movie-access-details" aria-label={`${title} details`}>
      <div className="movie-access-title-row">
        <h1 className="video-page-title">{title}</h1>
        {unlocked ? <span className="movie-access-unlocked">Unlocked</span> : null}
      </div>

      {details.length ? (
        <div className="movie-access-meta-row">
          {details.map((detail) => (
            <span key={detail} className="movie-access-meta-item">
              {detail}
            </span>
          ))}
        </div>
      ) : null}

      <div className={`movie-access-price-line${unlocked ? ' movie-access-price-line-unlocked' : ''}`}>
        {unlocked ? `Ready to watch. This ${unitLabel} is unlocked on your account.` : priceLabel}
      </div>
    </div>
  );
}
