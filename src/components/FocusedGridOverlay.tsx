'use client';

import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { getNextTurn, type GridState } from '@/lib/game';
import { useFocusTrap } from '@/lib/useFocusTrap';
import { INK_COLORS } from './HandMark';
import { TicTacToeBoard } from './TicTacToeBoard';

interface FocusedGridOverlayProps {
  grid: GridState;
  sourceRect: DOMRect;
  getSourceRect: () => DOMRect | null;
  lastPlayedCell: number | null;
  wasFinishedOnOpen: boolean;
  isClosing: boolean;
  nextEmptyGridId: number | null;
  onCellClick: (gridId: number, cellIndex: number) => void;
  onNextEmptyGrid: () => void;
  onRequestClose: () => void;
  onCloseComplete: () => void;
}

interface SparkSpec {
  id: number;
  left: string;
  top: string;
  tx: string;
  ty: string;
  rot: string;
  delay: string;
  kind: 'star' | 'dot' | 'tick';
  size: number;
}

const WIN_SPARKS: readonly SparkSpec[] = [
  { id: 0, left: '6%', top: '8%', tx: '-18px', ty: '-22px', rot: '-24deg', delay: '140ms', kind: 'star', size: 18 },
  { id: 1, left: '92%', top: '10%', tx: '20px', ty: '-20px', rot: '26deg', delay: '180ms', kind: 'star', size: 17 },
  { id: 2, left: '2%', top: '52%', tx: '-24px', ty: '-6px', rot: '-18deg', delay: '200ms', kind: 'tick', size: 15 },
  { id: 3, left: '97%', top: '54%', tx: '24px', ty: '-4px', rot: '22deg', delay: '160ms', kind: 'dot', size: 12 },
  { id: 4, left: '10%', top: '90%', tx: '-16px', ty: '18px', rot: '-30deg', delay: '220ms', kind: 'dot', size: 12 },
  { id: 5, left: '89%', top: '88%', tx: '18px', ty: '18px', rot: '28deg', delay: '150ms', kind: 'tick', size: 16 },
  { id: 6, left: '50%', top: '-2%', tx: '4px', ty: '-24px', rot: '14deg', delay: '210ms', kind: 'dot', size: 11 },
  { id: 7, left: '48%', top: '101%', tx: '-4px', ty: '22px', rot: '-16deg', delay: '190ms', kind: 'star', size: 15 },
];

const DRAW_TICKS: readonly SparkSpec[] = [
  { id: 0, left: '8%', top: '14%', tx: '-14px', ty: '-10px', rot: '-12deg', delay: '120ms', kind: 'tick', size: 14 },
  { id: 1, left: '92%', top: '16%', tx: '14px', ty: '-10px', rot: '12deg', delay: '150ms', kind: 'tick', size: 14 },
  { id: 2, left: '10%', top: '86%', tx: '-14px', ty: '10px', rot: '10deg', delay: '170ms', kind: 'dot', size: 10 },
  { id: 3, left: '90%', top: '84%', tx: '14px', ty: '10px', rot: '-10deg', delay: '140ms', kind: 'dot', size: 10 },
];

function RoundEndBurst({ winner }: { winner: GridState['winner'] }) {
  const color = winner ? INK_COLORS[winner] : '#756c5f';
  const accent = winner ? '#c7923e' : '#9c9282';
  const specs = winner ? WIN_SPARKS : DRAW_TICKS;

  return (
    <div className="pointer-events-none absolute inset-0 z-20 overflow-visible" aria-hidden="true">
      {specs.map((s) => {
        const strokeColor = s.id % 3 === 1 && winner ? accent : color;
        return (
          <svg
            key={s.id}
            viewBox="0 0 24 24"
            width={s.size}
            height={s.size}
            className="animate-ink-spark absolute -translate-x-1/2 -translate-y-1/2 overflow-visible"
            style={
              {
                left: s.left,
                top: s.top,
                '--tx': s.tx,
                '--ty': s.ty,
                '--rot': s.rot,
                '--delay': s.delay,
              } as React.CSSProperties
            }
          >
            {s.kind === 'star' ? (
              <path
                d="M12 2 Q12.8 10.5 22 12 Q12.8 13.5 12 22 Q11.2 13.5 2 12 Q11.2 10.5 12 2 Z"
                fill="none"
                stroke={strokeColor}
                strokeWidth="2.1"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            ) : s.kind === 'tick' ? (
              <path
                d="M4 16 Q11 10 20 7"
                fill="none"
                stroke={strokeColor}
                strokeWidth="2.4"
                strokeLinecap="round"
              />
            ) : (
              <circle cx="12" cy="12" r="3.4" fill={strokeColor} />
            )}
          </svg>
        );
      })}
    </div>
  );
}

function rectDeltaTransform(fromRect: DOMRect, naturalRect: DOMRect): string {
  const dx =
    fromRect.left + fromRect.width / 2 - (naturalRect.left + naturalRect.width / 2);
  const dy =
    fromRect.top + fromRect.height / 2 - (naturalRect.top + naturalRect.height / 2);
  const scale = naturalRect.width > 0 ? fromRect.width / naturalRect.width : 1;
  return `translate3d(${dx}px, ${dy}px, 0) scale(${scale})`;
}

export function FocusedGridOverlay({
  grid,
  sourceRect,
  getSourceRect,
  lastPlayedCell,
  wasFinishedOnOpen,
  isClosing,
  nextEmptyGridId,
  onCellClick,
  onNextEmptyGrid,
  onRequestClose,
  onCloseComplete,
}: FocusedGridOverlayProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const cardBgRef = useRef<HTMLDivElement>(null);
  const flyingBoardRef = useRef<HTMLDivElement>(null);
  const openBoardAnimRef = useRef<Animation | null>(null);
  const openBgAnimRef = useRef<Animation | null>(null);
  const initialGridIdRef = useRef(grid.id);
  const [entered, setEntered] = useState(false);

  const isFinished = Boolean(grid.winner || grid.isDraw);
  const justFinishedNow = isFinished && !wasFinishedOnOpen;
  const nextTurn = getNextTurn(grid);
  const statusText = grid.winner
    ? `Player ${grid.winner} wins!`
    : grid.isDraw
      ? 'Draw.'
      : `Player ${nextTurn}'s turn.`;

  // Keep keyboard focus inside the dialog; the parent returns focus to the
  // grid on the page once the closing animation has finished.
  useFocusTrap(dialogRef, { restoreFocus: false });

  // The focused control can disappear (the winning cell becomes disabled, or
  // "Next empty grid" unmounts); pull focus back into the dialog when it does.
  useEffect(() => {
    const el = dialogRef.current;
    if (el && !el.contains(document.activeElement)) el.focus({ preventScroll: true });
  }, [grid.id, isFinished]);

  // Reveal backdrop, top status pill, and bottom actions on mount (Strict Mode safe)
  useEffect(() => {
    const rafId = requestAnimationFrame(() => setEntered(true));
    return () => cancelAnimationFrame(rafId);
  }, []);

  // FLIP entrance on initial open; quick crisp swap when advancing to the next empty grid
  useLayoutEffect(() => {
    const boardEl = flyingBoardRef.current;
    const bgEl = cardBgRef.current;
    if (!boardEl || !bgEl) return;

    openBoardAnimRef.current?.cancel();
    openBgAnimRef.current?.cancel();

    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (prefersReducedMotion) {
      return;
    }

    if (grid.id === initialGridIdRef.current) {
      const naturalBoardRect = boardEl.getBoundingClientRect();
      const naturalBgRect = bgEl.getBoundingClientRect();
      if (naturalBoardRect.width === 0) return;

      const fromBoardTransform = rectDeltaTransform(sourceRect, naturalBoardRect);
      const fromBgTransform = rectDeltaTransform(sourceRect, naturalBgRect);

      openBoardAnimRef.current = boardEl.animate(
        [
          { transform: fromBoardTransform },
          { transform: 'translate3d(0px, 0px, 0) scale(1)' },
        ],
        {
          duration: 380,
          easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
          fill: 'forwards',
        }
      );

      openBgAnimRef.current = bgEl.animate(
        [
          { transform: fromBgTransform, opacity: 0 },
          { transform: 'translate3d(0px, 0px, 0) scale(1)', opacity: 1 },
        ],
        {
          duration: 340,
          easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
          fill: 'forwards',
        }
      );

      return () => {
        openBoardAnimRef.current?.cancel();
        openBgAnimRef.current?.cancel();
      };
    }

    // Subsequent in-overlay jump to the next empty grid
    openBoardAnimRef.current = boardEl.animate(
      [
        { transform: 'scale(0.93)', opacity: 0.4 },
        { transform: 'scale(1)', opacity: 1 },
      ],
      {
        duration: 210,
        easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
      }
    );

    return () => {
      openBoardAnimRef.current?.cancel();
    };
  }, [grid.id, sourceRect]);

  // FLIP exit using useLayoutEffect + Web Animations API so there is no post-paint jump or unmount blink
  useLayoutEffect(() => {
    if (!isClosing) return;

    const boardEl = flyingBoardRef.current;
    const bgEl = cardBgRef.current;
    const destRect = getSourceRect() ?? sourceRect;

    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (!boardEl || !bgEl || prefersReducedMotion) {
      onCloseComplete();
      return;
    }

    // Snapshot current visual position in case the user closed mid-entrance
    const currentBoardRect = boardEl.getBoundingClientRect();
    const currentBgRect = bgEl.getBoundingClientRect();
    const currentBgOpacity = Number.parseFloat(getComputedStyle(bgEl).opacity) || 1;

    openBoardAnimRef.current?.cancel();
    openBgAnimRef.current?.cancel();

    const naturalBoardRect = boardEl.getBoundingClientRect();
    const naturalBgRect = bgEl.getBoundingClientRect();

    const fromBoardTransform = rectDeltaTransform(currentBoardRect, naturalBoardRect);
    const toBoardTransform = rectDeltaTransform(destRect, naturalBoardRect);
    const fromBgTransform = rectDeltaTransform(currentBgRect, naturalBgRect);
    const toBgTransform = rectDeltaTransform(destRect, naturalBgRect);

    const closeBoardAnim = boardEl.animate(
      [{ transform: fromBoardTransform }, { transform: toBoardTransform }],
      {
        duration: 320,
        easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
        fill: 'forwards',
      }
    );

    const closeBgAnim = bgEl.animate(
      [
        { transform: fromBgTransform, opacity: currentBgOpacity },
        { transform: toBgTransform, opacity: 0 },
      ],
      {
        duration: 240,
        easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
        fill: 'forwards',
      }
    );

    let cancelled = false;
    closeBoardAnim.onfinish = () => {
      if (!cancelled) {
        onCloseComplete();
      }
    };

    return () => {
      cancelled = true;
      closeBoardAnim.cancel();
      closeBgAnim.cancel();
    };
  }, [isClosing, getSourceRect, sourceRect, onCloseComplete]);

  // Escape key closes/returns to the notebook page
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isClosing) {
        onRequestClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isClosing, onRequestClose]);

  const showChrome = entered && !isClosing;

  return (
    <div
      ref={dialogRef}
      tabIndex={-1}
      className="fixed inset-0 z-50 flex flex-col items-center justify-center p-4 outline-none"
      role="dialog"
      aria-modal="true"
      aria-label={`Tic-tac-toe grid #${grid.id + 1}`}
    >
      {/* Stable live region so every turn and result is announced (the visual pill remounts) */}
      <p className="sr-only" aria-live="polite" aria-atomic="true">
        Grid {grid.id + 1}: {statusText}
      </p>

      {/* Dimmed backdrop showing surrounding grids softly underneath */}
      <div
        onClick={() => !isClosing && onRequestClose()}
        className={`absolute inset-0 bg-[#2d2822]/35 backdrop-blur-[2px] transition-opacity duration-250 ${
          showChrome ? 'opacity-100' : 'opacity-0'
        }`}
      />

      {/* Top status bar (turn or result) */}
      <div
        className={`pointer-events-none relative z-10 mb-3 flex items-center gap-3 transition-all duration-200 ${
          showChrome ? 'translate-y-0 opacity-100' : 'translate-y-2 opacity-0'
        }`}
      >
        <div
          key={`${grid.id}-${grid.winner ?? (grid.isDraw ? 'draw' : 'play')}`}
          className={`paper-sheet pointer-events-auto rounded-full border border-[#cfc7b8] px-5 py-1.5 shadow-md ${
            justFinishedNow ? 'animate-result-pop' : ''
          }`}
          aria-hidden="true"
        >
          <div className="flex items-center gap-2.5 text-lg font-semibold tracking-wide sm:text-xl">
            <span className="text-sm text-[#7a7164]">#{grid.id + 1}</span>
            <span className="text-[#c5bdb0]">•</span>
            {grid.winner ? (
              <span style={{ color: INK_COLORS[grid.winner] }}>
                Player {grid.winner} wins!
              </span>
            ) : grid.isDraw ? (
              <span className="text-[#5c5346]">Draw — Cat&apos;s game!</span>
            ) : (
              <span style={{ color: INK_COLORS[nextTurn] }}>
                Player {nextTurn}&apos;s turn
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Centered enlarged notebook grid */}
      <div
        className={`relative z-10 w-[min(82vw,370px)] p-5 sm:p-7 ${
          justFinishedNow && !isClosing
            ? grid.winner
              ? 'animate-win-card'
              : 'animate-draw-wobble'
            : ''
        }`}
      >
        {/* Quick & light post-round hand-drawn ink burst */}
        {justFinishedNow && !isClosing && (
          <RoundEndBurst key={`${grid.id}-${grid.winner ?? 'draw'}`} winner={grid.winner} />
        )}

        {/* Card paper backing that fades cleanly as the grid returns */}
        <div
          ref={cardBgRef}
          className="paper-sheet paper-dots pointer-events-none absolute inset-0 rounded-xl border border-[#d3cbbd] shadow-[0_24px_55px_rgba(35,28,20,0.32),0_4px_14px_rgba(35,28,20,0.16)]"
          aria-hidden="true"
        />

        {/* Exact square flying board matching the miniature board slot */}
        <div ref={flyingBoardRef} className="relative z-10 aspect-square w-full">
          <TicTacToeBoard
            grid={grid}
            interactive={!isFinished && !isClosing}
            nextTurn={nextTurn}
            lastPlayedCell={lastPlayedCell}
            animateStrike={justFinishedNow}
            onCellClick={(cellIdx) => onCellClick(grid.id, cellIdx)}
            sizeVariant="focused"
          />
        </div>
      </div>

      {/* Bottom action buttons */}
      <div
        className={`pointer-events-none relative z-10 mt-4 flex flex-wrap items-center justify-center gap-2.5 transition-all duration-200 ${
          showChrome ? 'translate-y-0 opacity-100' : '-translate-y-2 opacity-0'
        }`}
      >
        <button
          type="button"
          onClick={() => !isClosing && onRequestClose()}
          className="paper-sheet pointer-events-auto cursor-pointer rounded-full border border-[#c7beae] px-5 py-1.5 text-base font-medium text-[#3b352c] shadow-sm transition hover:-translate-y-0.5 hover:border-[#8f8574] hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-[#faf7f0] active:translate-y-0"
        >
          {isFinished
            ? nextEmptyGridId !== null
              ? 'Back to page'
              : 'Click outside or tap to return'
            : 'Pause & back to page'}
        </button>

        {isFinished && nextEmptyGridId !== null && (
          <button
            type="button"
            onClick={() => !isClosing && onNextEmptyGrid()}
            className="pointer-events-auto cursor-pointer rounded-full border border-[#24201b] bg-[#24201b] px-5 py-1.5 text-base font-medium text-[#f8f5ec] shadow-sm transition hover:-translate-y-0.5 hover:bg-[#38322a] hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-[#faf7f0] active:translate-y-0"
          >
            Next empty grid (#{nextEmptyGridId + 1}) →
          </button>
        )}
      </div>
    </div>
  );
}
