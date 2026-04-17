'use client';

import { cn } from '@/lib/utils';

/**
 * Pixel-art Claude mascot. Rendered as 16x16 grid of pixels.
 * Shape matches the official Claude Code mascot (rounded blocky body, two eyes, four legs).
 */
export function ClaudeIcon({ className, size = 16 }: { className?: string; size?: number }) {
  return (
    <svg
      viewBox="0 0 16 16"
      width={size}
      height={size}
      className={cn('shrink-0', className)}
      shapeRendering="crispEdges"
      aria-hidden="true"
    >
      {/* Body — rounded block */}
      <path
        d="M3 5h10v1h1v4h-1v1h-1v1h-1v-1h-1v2h-1v-2h-2v2h-1v-2h-1v1h-1v-1h-1v-1h-1v-4h1z"
        fill="currentColor"
      />
      {/* Eyes */}
      <rect x="5" y="7" width="1" height="2" fill="#0A0A0A" />
      <rect x="10" y="7" width="1" height="2" fill="#0A0A0A" />
    </svg>
  );
}
