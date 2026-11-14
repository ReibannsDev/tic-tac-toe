import React from 'react';
import type { Player } from '@/lib/game';
import { getHandOPath, getHandXPaths } from '@/lib/handdrawn';

interface HandMarkProps {
  player: Player;
  gridId: number;
  cellIndex: number;
  animated?: boolean;
  ghost?: boolean;
  strokeWidth?: number;
}

export const INK_COLORS: Record<Player, string> = {
  X: '#1c2b4a', // Deep fountain-pen navy/charcoal ink
  O: '#b3342b', // Warm crimson pen ink
};

export function HandMark({
  player,
  gridId,
  cellIndex,
  animated = false,
  ghost = false,
  strokeWidth = 6.5,
}: HandMarkProps) {
  const color = INK_COLORS[player];

  if (player === 'X') {
    const [stroke1, stroke2] = getHandXPaths(gridId, cellIndex);
    return (
      <svg
        viewBox="0 0 100 100"
        className={`h-full w-full overflow-visible ${ghost ? 'opacity-25' : ''}`}
        aria-hidden="true"
      >
        <path
          d={stroke1}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
          pathLength={animated ? 1 : undefined}
          className={animated ? 'animate-draw-stroke' : undefined}
        />
        <path
          d={stroke2}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
          pathLength={animated ? 1 : undefined}
          className={animated ? 'animate-draw-stroke-delay' : undefined}
        />
      </svg>
    );
  }

  const oPath = getHandOPath(gridId, cellIndex);
  return (
    <svg
      viewBox="0 0 100 100"
      className={`h-full w-full overflow-visible ${ghost ? 'opacity-25' : ''}`}
      aria-hidden="true"
    >
      <path
        d={oPath}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        pathLength={animated ? 1 : undefined}
        className={animated ? 'animate-draw-stroke-o' : undefined}
      />
    </svg>
  );
}

/**
 * Unmistakably circular hand-drawn 'O' and crisp hand-drawn 'X'
 * for UI badges (scoreboard and next-starter indicator) so 'O' never reads as '0'.
 */
export function HandSymbolIcon({
  player,
  className = 'h-5 w-5',
}: {
  player: Player;
  className?: string;
}) {
  const color = INK_COLORS[player];

  if (player === 'X') {
    return (
      <svg viewBox="0 0 100 100" className={className} aria-hidden="true">
        <path
          d="M 22 22 Q 51 49 78 78"
          fill="none"
          stroke={color}
          strokeWidth={11}
          strokeLinecap="round"
        />
        <path
          d="M 78 23 Q 49 51 22 78"
          fill="none"
          stroke={color}
          strokeWidth={11}
          strokeLinecap="round"
        />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 100 100" className={className} aria-hidden="true">
      <path
        d="M 52 17 C 71 17 84 31 84 50 C 84 70 70 84 50 84 C 30 84 16 70 16 50 C 16 31 30 18 49 18"
        fill="none"
        stroke={color}
        strokeWidth={11}
        strokeLinecap="round"
      />
    </svg>
  );
}
