declare module 'hls.js' {
  export type HlsErrorData = {
    fatal?: boolean;
    [key: string]: unknown;
  };

  export default class Hls {
    static Events: {
      ERROR: string;
    };

    static isSupported(): boolean;

    constructor(config?: Record<string, unknown>);
    loadSource(url: string): void;
    attachMedia(media: HTMLMediaElement): void;
    on(event: string, handler: (event: string, data: HlsErrorData) => void): void;
    destroy(): void;
  }
}

declare module 'lucide-react' {
  import * as React from 'react';

  export type LucideProps = React.SVGProps<SVGSVGElement> & {
    size?: string | number;
    absoluteStrokeWidth?: boolean;
  };

  export type LucideIcon = React.ComponentType<LucideProps>;

  export const Activity: LucideIcon;
  export const AlertTriangle: LucideIcon;
  export const BarChart3: LucideIcon;
  export const Calendar: LucideIcon;
  export const Check: LucideIcon;
  export const CheckCircle: LucideIcon;
  export const ChevronDown: LucideIcon;
  export const ChevronLeft: LucideIcon;
  export const ChevronRight: LucideIcon;
  export const Clock: LucideIcon;
  export const DollarSign: LucideIcon;
  export const Download: LucideIcon;
  export const Eye: LucideIcon;
  export const FileText: LucideIcon;
  export const Film: LucideIcon;
  export const Filter: LucideIcon;
  export const Grid: LucideIcon;
  export const Heart: LucideIcon;
  export const Info: LucideIcon;
  export const List: LucideIcon;
  export const Maximize: LucideIcon;
  export const MessageSquare: LucideIcon;
  export const Pause: LucideIcon;
  export const Play: LucideIcon;
  export const PlayCircle: LucideIcon;
  export const Plus: LucideIcon;
  export const Search: LucideIcon;
  export const Settings: LucideIcon;
  export const Share2: LucideIcon;
  export const Shield: LucideIcon;
  export const SkipBack: LucideIcon;
  export const SkipForward: LucideIcon;
  export const SlidersHorizontal: LucideIcon;
  export const Star: LucideIcon;
  export const ThumbsUp: LucideIcon;
  export const Trash2: LucideIcon;
  export const TrendingUp: LucideIcon;
  export const Upload: LucideIcon;
  export const Users: LucideIcon;
  export const Volume2: LucideIcon;
  export const VolumeX: LucideIcon;
  export const Wifi: LucideIcon;
  export const WifiOff: LucideIcon;
  export const X: LucideIcon;
  export const Zap: LucideIcon;
}
