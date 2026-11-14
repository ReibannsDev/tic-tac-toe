'use client';

import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { getNextTurn, type GridState } from '@/lib/game';
import { INK_COLORS } from './HandMark';
import { TicTacToeBoard } from './TicTacToeBoard';

interface FocusedGridOverlayProps {
  grid: GridState;
  pageNumber: number;
  sourceRect: DOMRect;
  getSourceRect: () => DOMRect | null;
  lastPlayedCell: number | null;
  wasFinishedOnOpen: boolean;
  isClosing: boolean;
  onCellClick: (gridId: number, cellIndex: number) => void;
  onRequestClose: () => void;
  onCloseComplete: () => void;
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
  pageNumber,
  sourceRect,
  getSourceRect,
  lastPlayedCell,
  wasFinishedOnOpen,
  isClosing,
  onCellClick,
  onRequestClose,
  onCloseComplete,
}: FocusedGridOverlayProps) {
  const cardBgRef = useRef<HTMLDivElement>(null);
  const flyingBoardRef = useRef<HTMLDivElement>(null);
  const openBoardAnimRef = useRef<Animation | null>(null);
  const openBgAnimRef = useRef<Animation | null>(null);
  const [entered, setEntered] = useState(false);

  const isFinished = Boolean(grid.winner || grid.isDraw);
  const justFinishedNow = isFinished && !wasFinishedOnOpen;
  const nextTurn = getNextTurn(grid);

  // FLIP entrance using Web Animations API for zero-flicker, pixel-exact board alignment
  useLayoutEffect(() => {
    const boardEl = flyingBoardRef.current;
    const bgEl = cardBgRef.current;
    if (!boardEl || !bgEl) return;

    const naturalBoardRect = boardEl.getBoundingClientRect();
    const naturalBgRect = bgEl.getBoundingClientRect();
    if (naturalBoardRect.width === 0) return;

    const fromBoardTransform = rectDeltaTransform(sourceRect, naturalBoardRect);
    const fromBgTransform = rectDeltaTransform(sourceRect, naturalBgRect);

    openBoardAnimRef.current?.cancel();
    openBgAnimRef.current?.cancel();

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

    const rafId = requestAnimationFrame(() => setEntered(true));
    return () => {
      cancelAnimationFrame(rafId);
      openBoardAnimRef.current?.cancel();
      openBgAnimRef.current?.cancel();
    };
  }, [sourceRect]);

  // FLIP exit using useLayoutEffect + Web Animations API so there is no post-paint jump or unmount blink
  useLayoutEffect(() => {
    if (!isClosing) return;

    const boardEl = flyingBoardRef.current;
    const bgEl = cardBgRef.current;
    const destRect = getSourceRect() ?? sourceRect;

    if (!boardEl || !bgEl) {
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
      className="fixed inset-0 z-50 flex flex-col items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label={`Tic-tac-toe grid #${grid.id + 1}`}
    >
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
        <div className="paper-sheet pointer-events-auto rounded-full border border-[#cfc7b8] px-5 py-1.5 shadow-md">
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
      <div className="relative z-10 w-[min(82vw,370px)] p-5 sm:p-7">
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
            pageNumber={pageNumber}
            interactive={!isFinished && !isClosing}
            nextTurn={nextTurn}
            lastPlayedCell={lastPlayedCell}
            animateStrike={justFinishedNow}
            onCellClick={(cellIdx) => onCellClick(grid.id, cellIdx)}
            sizeVariant="focused"
          />
        </div>
      </div>

      {/* Bottom action hint */}
      <div
        className={`pointer-events-none relative z-10 mt-4 flex items-center gap-3 transition-all duration-200 ${
          showChrome ? 'translate-y-0 opacity-100' : '-translate-y-2 opacity-0'
        }`}
      >
        <button
          type="button"
          onClick={() => !isClosing && onRequestClose()}
          className="paper-sheet pointer-events-auto cursor-pointer rounded-full border border-[#c7beae] px-5 py-1.5 text-base font-medium text-[#3b352c] shadow-sm transition hover:-translate-y-0.5 hover:border-[#8f8574] hover:shadow-md active:translate-y-0"
        >
          {isFinished ? 'Click outside or tap to return' : 'Pause & back to page'}
        </button>
      </div>
    </div>
  );
}
