'use client';

import React, { useMemo } from 'react';
import type { GridState, Player } from '@/lib/game';
import { getHandGridGeometry, getWinStrikePath } from '@/lib/handdrawn';
import { HandMark, INK_COLORS } from './HandMark';

interface TicTacToeBoardProps {
  grid: GridState;
  pageNumber?: number;
  interactive?: boolean;
  nextTurn?: Player;
  lastPlayedCell?: number | null;
  animateStrike?: boolean;
  onCellClick?: (cellIndex: number) => void;
  sizeVariant?: 'mini' | 'focused';
}

export function TicTacToeBoard({
  grid,
  pageNumber = 1,
  interactive = false,
  nextTurn = 'X',
  lastPlayedCell = null,
  animateStrike = false,
  onCellClick,
  sizeVariant = 'mini',
}: TicTacToeBoardProps) {
  const geometry = useMemo(
    () => getHandGridGeometry(grid.id, pageNumber),
    [grid.id, pageNumber]
  );

  const strikePath = useMemo(() => {
    if (!grid.winLine) return null;
    return getWinStrikePath(grid.winLine, grid.id, pageNumber);
  }, [grid.winLine, grid.id, pageNumber]);

  const isFinished = Boolean(grid.winner || grid.isDraw);
  const gridStrokeWidth = sizeVariant === 'focused' ? 2.4 : 2.8;
  const markStrokeWidth = sizeVariant === 'focused' ? 6.5 : 8.5;

  return (
    <div
      className="relative aspect-square w-full select-none"
      style={{
        transform: `rotate(${geometry.tiltDeg}deg)`,
      }}
    >
      {/* Hand-drawn # grid lines */}
      <svg
        viewBox="0 0 100 100"
        className="pointer-events-none absolute inset-0 h-full w-full overflow-visible"
        aria-hidden="true"
      >
        {geometry.lines.map((d, idx) => (
          <path
            key={idx}
            d={d}
            fill="none"
            stroke="#24201b"
            strokeWidth={gridStrokeWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity={0.88}
          />
        ))}
      </svg>

      {/* 3x3 cells aligned with the inner # squares */}
      <div className="absolute inset-[4%] grid grid-cols-3 grid-rows-3">
        {grid.board.map((cell, idx) => {
          const canPlay = interactive && !isFinished && cell === null;
          const shouldAnimateMark = sizeVariant === 'focused' && lastPlayedCell === idx;

          if (interactive) {
            return (
              <button
                key={idx}
                type="button"
                disabled={!canPlay}
                onClick={() => canPlay && onCellClick?.(idx)}
                aria-label={`Grid ${grid.id + 1}, row ${Math.floor(idx / 3) + 1} column ${(idx % 3) + 1}${cell ? `, ${cell}` : ', empty'}`}
                className={`group relative flex items-center justify-center p-[14%] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1c2b4a]/40 focus-visible:rounded-md ${
                  canPlay ? 'cursor-pointer hover:bg-[#24201b]/[0.035] active:scale-95' : 'cursor-default'
                }`}
              >
                {cell ? (
                  <HandMark
                    player={cell}
                    gridId={grid.id}
                    cellIndex={idx}
                    pageNumber={pageNumber}
                    animated={shouldAnimateMark}
                    strokeWidth={markStrokeWidth}
                  />
                ) : canPlay ? (
                  <span className="pointer-events-none h-full w-full opacity-0 transition-opacity duration-150 group-hover:opacity-100">
                    <HandMark
                      player={nextTurn}
                      gridId={grid.id}
                      cellIndex={idx}
                      pageNumber={pageNumber}
                      ghost
                      strokeWidth={markStrokeWidth}
                    />
                  </span>
                ) : null}
              </button>
            );
          }

          return (
            <div key={idx} className="relative flex items-center justify-center p-[15%]">
              {cell ? (
                <HandMark
                  player={cell}
                  gridId={grid.id}
                  cellIndex={idx}
                  pageNumber={pageNumber}
                  strokeWidth={markStrokeWidth}
                />
              ) : null}
            </div>
          );
        })}
      </div>

      {/* Hand-drawn win strike-through line */}
      {strikePath && grid.winner ? (
        <svg
          viewBox="0 0 100 100"
          className="pointer-events-none absolute inset-0 h-full w-full overflow-visible"
          aria-hidden="true"
        >
          <path
            d={strikePath}
            fill="none"
            stroke={INK_COLORS[grid.winner]}
            strokeWidth={sizeVariant === 'focused' ? 3.8 : 4.6}
            strokeLinecap="round"
            opacity={0.92}
            pathLength={animateStrike ? 1 : undefined}
            className={animateStrike ? 'animate-draw-strike' : undefined}
          />
        </svg>
      ) : null}
    </div>
  );
}
