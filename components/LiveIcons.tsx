import type { SVGProps } from 'react';

type IconProps = SVGProps<SVGSVGElement> & { size?: number };
const base = (size = 20) => ({ width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, 'aria-hidden': true });

export function ArrowLeft({ size, ...props }: IconProps) { return <svg {...base(size)} {...props}><path d="m15 18-6-6 6-6"/><path d="M9 12h10"/></svg>; }
export function CalendarClock({ size, ...props }: IconProps) { return <svg {...base(size)} {...props}><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18M12 14v3l2 1"/></svg>; }
export function ChevronRight({ size, ...props }: IconProps) { return <svg {...base(size)} {...props}><path d="m9 18 6-6-6-6"/></svg>; }
export function ExternalLink({ size, ...props }: IconProps) { return <svg {...base(size)} {...props}><path d="M15 3h6v6M10 14 21 3M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/></svg>; }
export function MapPin({ size, ...props }: IconProps) { return <svg {...base(size)} {...props}><path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2"/></svg>; }
export function MessageCircle({ size, ...props }: IconProps) { return <svg {...base(size)} {...props}><path d="M21 15a4 4 0 0 1-4 4H8l-5 3 1.5-5A8 8 0 1 1 21 15Z"/></svg>; }
export function Moon({ size, ...props }: IconProps) { return <svg {...base(size)} {...props}><path d="M21 12.8A9 9 0 1 1 11.2 3 7 7 0 0 0 21 12.8Z"/></svg>; }
export function Pencil({ size, ...props }: IconProps) { return <svg {...base(size)} {...props}><path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4Z"/></svg>; }
export function Play({ size, ...props }: IconProps) { return <svg {...base(size)} {...props}><path d="m8 5 11 7-11 7Z"/></svg>; }
export function Plus({ size, ...props }: IconProps) { return <svg {...base(size)} {...props}><path d="M12 5v14M5 12h14"/></svg>; }
export function Radio({ size, ...props }: IconProps) { return <svg {...base(size)} {...props}><circle cx="12" cy="12" r="2"/><path d="M8.5 8.5a5 5 0 0 0 0 7M15.5 8.5a5 5 0 0 1 0 7M5 5a10 10 0 0 0 0 14M19 5a10 10 0 0 1 0 14"/></svg>; }
export function Reply({ size, ...props }: IconProps) { return <svg {...base(size)} {...props}><path d="m9 17-5-5 5-5"/><path d="M4 12h10a6 6 0 0 1 6 6v1"/></svg>; }
export function Send({ size, ...props }: IconProps) { return <svg {...base(size)} {...props}><path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/></svg>; }
export function ShieldCheck({ size, ...props }: IconProps) { return <svg {...base(size)} {...props}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z"/><path d="m9 12 2 2 4-4"/></svg>; }
export function Smile({ size, ...props }: IconProps) { return <svg {...base(size)} {...props}><circle cx="12" cy="12" r="9"/><path d="M8 14s1.5 2 4 2 4-2 4-2M9 9h.01M15 9h.01"/></svg>; }
export function Sparkles({ size, ...props }: IconProps) { return <svg {...base(size)} {...props}><path d="m12 3 1.3 3.7L17 8l-3.7 1.3L12 13l-1.3-3.7L7 8l3.7-1.3ZM5 14l.8 2.2L8 17l-2.2.8L5 20l-.8-2.2L2 17l2.2-.8Z"/></svg>; }
export function Sun({ size, ...props }: IconProps) { return <svg {...base(size)} {...props}><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.42 1.42M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.42-1.42M17.66 6.34l1.41-1.41"/></svg>; }
export function Trash2({ size, ...props }: IconProps) { return <svg {...base(size)} {...props}><path d="M3 6h18M8 6V4h8v2M19 6l-1 15H6L5 6M10 11v5M14 11v5"/></svg>; }
export function Trophy({ size, ...props }: IconProps) { return <svg {...base(size)} {...props}><path d="M8 4h8v5a4 4 0 0 1-8 0ZM8 6H4v2a4 4 0 0 0 4 4M16 6h4v2a4 4 0 0 1-4 4M12 13v5M8 21h8M9 18h6"/></svg>; }
export function X({ size, ...props }: IconProps) { return <svg {...base(size)} {...props}><path d="M18 6 6 18M6 6l12 12"/></svg>; }
