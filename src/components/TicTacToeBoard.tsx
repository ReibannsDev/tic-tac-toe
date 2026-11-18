'use client';

import React, { useMemo } from 'react';
import type { GridState, Player } from '@/lib/game';
import { getHandGridGeometry, getWinStrikePath } from '@/lib/handdrawn';
import { useRovingGrid, ROVING_ATTR } from '@/lib/useRovingGrid';
import { HandMark, INK_COLORS } from './HandMark';

interface TicTacToeBoardProps {
  grid: GridState;
  interactive?: boolean;
  nextTurn?: Player;
  lastPlayedCell?: number | null;
  animateStrike?: boolean;
  onCellClick?: (cellIndex: number) => void;
  sizeVariant?: 'mini' | 'focused';
}

export function TicTacToeBoard({
  grid,
  interactive = false,
  nextTurn = 'X',
  lastPlayedCell = null,
  animateStrike = false,
  onCellClick,
  sizeVariant = 'mini',
}: TicTacToeBoardProps) {
  const geometry = useMemo(
    () => getHandGridGeometry(grid.id),
    [grid.id]
  );

  const strikePath = useMemo(() => {
    if (!grid.winLine) return null;
    return getWinStrikePath(grid.winLine, grid.id);
  }, [grid.winLine, grid.id]);

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
      {interactive && !isFinished ? (
        <PlayableCells
          grid={grid}
          nextTurn={nextTurn}
          lastPlayedCell={lastPlayedCell}
          markStrokeWidth={markStrokeWidth}
          onCellClick={onCellClick}
        />
      ) : (
        <div className="absolute inset-[4%] grid grid-cols-3 grid-rows-3">
          {grid.board.map((cell, idx) => (
            <div key={idx} className="relative flex items-center justify-center p-[15%]">
              {cell ? (
                <HandMark
                  player={cell}
                  gridId={grid.id}
                  cellIndex={idx}
                  strokeWidth={markStrokeWidth}
                />
              ) : null}
            </div>
          ))}
        </div>
      )}

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

const ROWS = [0, 1, 2] as const;

interface PlayableCellsProps {
  grid: GridState;
  nextTurn: Player;
  lastPlayedCell: number | null;
  markStrokeWidth: number;
  onCellClick?: (cellIndex: number) => void;
}

/**
 * The playable 3x3 as an ARIA grid: one Tab stop, arrow keys between cells.
 * Taken cells stay focusable (aria-disabled, not disabled) so keyboard and
 * screen reader users can move across them and hear what is there.
 */
function PlayableCells({
  grid,
  nextTurn,
  lastPlayedCell,
  markStrokeWidth,
  onCellClick,
}: PlayableCellsProps) {
  const firstEmpty = grid.board.findIndex((cell) => cell === null);
  const { tabIndexFor, gridProps } = useRovingGrid(firstEmpty === -1 ? 0 : firstEmpty);

  return (
    <div
      role="grid"
      aria-label={`Grid ${grid.id + 1} board`}
      className="absolute inset-[4%] flex flex-col"
      {...gridProps}
    >
      {ROWS.map((row) => (
        <div key={row} role="row" className="grid flex-1 grid-cols-3">
          {ROWS.map((col) => {
            const idx = row * 3 + col;
            const cell = grid.board[idx];
            const canPlay = cell === null;

            return (
              <div key={col} role="gridcell" className="flex">
                <button
                  type="button"
                  tabIndex={tabIndexFor(idx)}
                  {...{ [ROVING_ATTR]: idx }}
                  aria-disabled={canPlay ? undefined : true}
                  onClick={() => canPlay && onCellClick?.(idx)}
                  aria-label={`Grid ${grid.id + 1}, row ${row + 1} column ${col + 1}${cell ? `, ${cell}` : ', empty'}`}
                  className={`group relative flex flex-1 items-center justify-center p-[14%] transition-colors focus:outline-none focus-visible:rounded-md focus-visible:ring-2 focus-visible:ring-[#1c2b4a]/40 ${
                    canPlay ? 'cursor-pointer hover:bg-[#24201b]/[0.035] active:scale-95' : 'cursor-default'
                  }`}
                >
                  {cell ? (
                    <HandMark
                      player={cell}
                      gridId={grid.id}
                      cellIndex={idx}
                      animated={lastPlayedCell === idx}
                      strokeWidth={markStrokeWidth}
                    />
                  ) : (
                    <span className="pointer-events-none h-full w-full opacity-0 transition-opacity duration-150 group-hover:opacity-100 group-focus-visible:opacity-100">
                      <HandMark
                        player={nextTurn}
                        gridId={grid.id}
                        cellIndex={idx}
                        ghost
                        strokeWidth={markStrokeWidth}
                      />
                    </span>
                  )}
                </button>
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}
