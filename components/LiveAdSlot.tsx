export default function LiveAdSlot({ compact = false }: { compact?: boolean }) {
  const href = process.env.NEXT_PUBLIC_LIVE_AD_HREF?.trim();
  const imageUrl = process.env.NEXT_PUBLIC_LIVE_AD_IMAGE_URL?.trim();
  const label = process.env.NEXT_PUBLIC_LIVE_AD_LABEL?.trim() || 'Match-day partner';
  const content = <><span className="live-ad-label">Advertisement</span>{imageUrl ? <span className="live-ad-art" style={{ backgroundImage: `url(${imageUrl})` }} /> : <span className="live-ad-placeholder-mark">ACE <b>PLAY</b></span>}<div><strong>{label}</strong><p>{href ? 'Exclusive offers for the ACE match room.' : 'Premium partner placement available.'}</p></div>{href ? <span className="live-ad-cta">Explore offer ↗</span> : <span className="live-ad-cta">Advertise here</span>}</>;
  return href ? <a className={`live-ad-slot${compact ? ' compact' : ''}`} href={href} target="_blank" rel="sponsored noreferrer">{content}</a> : <div className={`live-ad-slot${compact ? ' compact' : ''}`}>{content}</div>;
}
