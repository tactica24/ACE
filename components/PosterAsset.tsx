'use client';

import { useState } from 'react';

type PosterAssetProps = {
  src?: string | null;
  alt?: string;
  loading?: 'eager' | 'lazy';
  decoding?: 'async' | 'auto' | 'sync';
  fallbackLabel?: string;
  ariaHidden?: boolean;
  imgClassName?: string;
  fallbackClassName?: string;
};

export default function PosterAsset({
  src,
  alt = '',
  loading = 'lazy',
  decoding = 'async',
  fallbackLabel = 'Ace Studio',
  ariaHidden = true,
  imgClassName,
  fallbackClassName
}: PosterAssetProps) {
  const [failed, setFailed] = useState(false);
  const showImage = Boolean(src && !failed);

  if (!showImage) {
    return <span className={fallbackClassName}>{fallbackLabel}</span>;
  }

  return (
    <img
      className={imgClassName}
      src={src ?? undefined}
      alt={alt}
      loading={loading}
      decoding={decoding}
      aria-hidden={ariaHidden}
      onError={() => setFailed(true)}
    />
  );
}
