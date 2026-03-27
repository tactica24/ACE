'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';

function getCountdownParts(targetIso?: string | null) {
  if (!targetIso) return null;
  const targetTime = new Date(targetIso).getTime();
  if (Number.isNaN(targetTime)) return null;

  const delta = Math.max(targetTime - Date.now(), 0);
  const totalSeconds = Math.floor(delta / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return { days, hours, minutes, seconds };
}

export default function LaunchPage({
  title,
  message,
  countdownAt,
  ctaLabel,
  ctaHref,
  showProducerLink = true
}: {
  title: string;
  message: string;
  countdownAt?: string | null;
  ctaLabel?: string | null;
  ctaHref?: string | null;
  showProducerLink?: boolean;
}) {
  const [countdown, setCountdown] = useState(() => getCountdownParts(countdownAt));

  useEffect(() => {
    if (!countdownAt) {
      setCountdown(null);
      return;
    }

    setCountdown(getCountdownParts(countdownAt));
    const timer = window.setInterval(() => {
      setCountdown(getCountdownParts(countdownAt));
    }, 1000);

    return () => window.clearInterval(timer);
  }, [countdownAt]);

  const formattedLaunchDate = useMemo(() => {
    if (!countdownAt) return null;
    const parsed = new Date(countdownAt);
    if (Number.isNaN(parsed.getTime())) return null;
    return parsed.toLocaleString();
  }, [countdownAt]);

  return (
    <div className="section">
      <div className="container">
        <div className="card" style={{ padding: '56px 32px', maxWidth: 960, margin: '0 auto' }}>
          <div className="pill">Launch mode</div>
          <h1 className="hero-title" style={{ marginTop: 18 }}>{title}</h1>
          <p className="muted" style={{ maxWidth: 720 }}>{message}</p>

          {countdown ? (
            <div className="detail-grid" style={{ marginTop: 28 }}>
              <div className="detail-card">
                <span className="detail-label">Days</span>
                <strong>{countdown.days}</strong>
              </div>
              <div className="detail-card">
                <span className="detail-label">Hours</span>
                <strong>{String(countdown.hours).padStart(2, '0')}</strong>
              </div>
              <div className="detail-card">
                <span className="detail-label">Minutes</span>
                <strong>{String(countdown.minutes).padStart(2, '0')}</strong>
              </div>
              <div className="detail-card">
                <span className="detail-label">Seconds</span>
                <strong>{String(countdown.seconds).padStart(2, '0')}</strong>
              </div>
            </div>
          ) : null}

          {formattedLaunchDate ? (
            <p className="muted" style={{ marginTop: 18 }}>Launch date: {formattedLaunchDate}</p>
          ) : null}

          <div className="home-actions" style={{ marginTop: 24 }}>
            <Link className="btn btn-primary" href="/auth/login">Sign in</Link>
            {showProducerLink ? <Link className="btn btn-ghost" href="/creator">Producer access</Link> : null}
            {ctaLabel && ctaHref ? <Link className="btn btn-ghost" href={ctaHref}>{ctaLabel}</Link> : null}
          </div>
        </div>
      </div>
    </div>
  );
}
