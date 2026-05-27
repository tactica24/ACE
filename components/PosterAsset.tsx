'use client';

import { useState } from 'react';
import Image from 'next/image';

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
  fallbackLabel = '',
  ariaHidden = true,
  imgClassName,
  fallbackClassName
}: PosterAssetProps) {
  const [failed, setFailed] = useState(false);
  const showImage = Boolean(src && !failed);

  if (!showImage) {
    return fallbackLabel ? <span className={fallbackClassName}>{fallbackLabel}</span> : null;
  }

  return (
    <Image
      className={imgClassName}
      src={src ?? undefined}
      alt={alt}
      width={800}
      height={1200}
      sizes="(max-width: 768px) 100vw, 33vw"
      unoptimized
      loading={loading}
      aria-hidden={ariaHidden}
      onError={() => setFailed(true)}
    />
  );
}
