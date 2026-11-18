'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { countMoves, getGridStatus, GRID_COUNT, SHEET_COLUMNS, type GridState } from '@/lib/game';
import {
  assignStarterIfUntouched,
  clearSheet,
  playMove,
  resetScore,
  setSoundEnabled,
  useNotebookStore,
} from '@/lib/notebookStore';
import {
  playDraw,
  playDrawO,
  playDrawX,
  playPageFlip,
  playWin,
  playZoomIn,
  playZoomOut,
  preloadPenSounds,
} from '@/lib/sound';
import { ROVING_ATTR, useRovingGrid } from '@/lib/useRovingGrid';
import { FocusedGridOverlay } from './FocusedGridOverlay';
import { NewSheetDialog } from './NewSheetDialog';
import { ScoreBoard } from './ScoreBoard';
import { SpiralBinding } from './SpiralBinding';
import { TicTacToeBoard } from './TicTacToeBoard';

function describeGrid(grid: GridState): string {
  const status = getGridStatus(grid);
  const label = `Grid #${grid.id + 1}`;
  if (status === 'won') return `${label}, won by ${grid.winner}`;
  if (status === 'draw') return `${label}, draw`;
  if (status === 'playing') return `${label}, in progress`;
  return `${label}, empty`;
}

function SoundIcon({ muted }: { muted: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={`h-4 w-4 shrink-0 ${muted ? 'text-[#8a8070]' : ''}`}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M11 5 6 9H3v6h3l5 4V5Z" />
      {muted ? (
        <>
          <path d="m16 9 5 6" />
          <path d="m21 9-5 6" />
        </>
      ) : (
        <>
          <path d="M15.5 8.5a5 5 0 0 1 0 7" />
          <path d="M18.5 6a8.5 8.5 0 0 1 0 12" />
        </>
      )}
    </svg>
  );
}

export function NotebookGame() {
  const { grids, score, nextStarter, soundEnabled } = useNotebookStore();

  // Focus / FLIP animation state
  const [focusedGridId, setFocusedGridId] = useState<number | null>(null);
  const [sourceRect, setSourceRect] = useState<DOMRect | null>(null);
  const [isClosing, setIsClosing] = useState(false);
  const [wasFinishedOnOpen, setWasFinishedOnOpen] = useState(false);
  const [lastPlayedCell, setLastPlayedCell] = useState<number | null>(null);
  const [pageFlipping, setPageFlipping] = useState(false);
  const [showNewSheetConfirm, setShowNewSheetConfirm] = useState(false);

  const cellRefs = useRef<(HTMLDivElement | null)[]>([]);
  const sheetNav = useRovingGrid(0);
  const flipTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    if (soundEnabled) preloadPenSounds();
  }, [soundEnabled]);

  useEffect(() => {
    return () => {
      if (flipTimeoutRef.current !== null) window.clearTimeout(flipTimeoutRef.current);
    };
  }, []);

  const openGrid = useCallback(
    (gridId: number) => {
      const el = cellRefs.current[gridId];
      if (!el) return;

      const targetGrid = grids[gridId];
      assignStarterIfUntouched(gridId);

      setSourceRect(el.getBoundingClientRect());
      setWasFinishedOnOpen(Boolean(targetGrid.winner || targetGrid.isDraw));
      setLastPlayedCell(null);
      setIsClosing(false);
      setFocusedGridId(gridId);
      playZoomIn(soundEnabled);
    },
    [grids, soundEnabled]
  );

  const handleSelectGrid = useCallback(
    (gridId: number) => {
      if (focusedGridId !== null || showNewSheetConfirm) return;
      openGrid(gridId);
    },
    [focusedGridId, showNewSheetConfirm, openGrid]
  );

  const nextEmptyGridId = useMemo(() => {
    if (focusedGridId === null) return null;
    for (let offset = 1; offset < GRID_COUNT; offset++) {
      const idx = (focusedGridId + offset) % GRID_COUNT;
      if (getGridStatus(grids[idx]) === 'empty') return idx;
    }
    return null;
  }, [focusedGridId, grids]);

  const handleNextEmptyGrid = useCallback(() => {
    if (nextEmptyGridId !== null) openGrid(nextEmptyGridId);
  }, [nextEmptyGridId, openGrid]);

  const handleCellClick = useCallback(
    (gridId: number, cellIndex: number) => {
      const result = playMove(gridId, cellIndex);
      if (!result) return;

      if (result.player === 'X') playDrawX(soundEnabled);
      else playDrawO(soundEnabled);
      if (result.outcome === 'win') playWin(soundEnabled);
      else if (result.outcome === 'draw') playDraw(soundEnabled);

      setLastPlayedCell(cellIndex);
    },
    [soundEnabled]
  );

  const getSourceRect = useCallback(() => {
    if (focusedGridId === null) return null;
    return cellRefs.current[focusedGridId]?.getBoundingClientRect() ?? null;
  }, [focusedGridId]);

  const handleRequestClose = useCallback(() => {
    if (isClosing) return;
    playZoomOut(soundEnabled);
    setIsClosing(true);
  }, [isClosing, soundEnabled]);

  const handleCloseComplete = useCallback(() => {
    // Return keyboard focus to the grid the player was just looking at
    const gridButton =
      focusedGridId !== null ? cellRefs.current[focusedGridId]?.closest('button') : null;
    setFocusedGridId(null);
    setSourceRect(null);
    setIsClosing(false);
    setLastPlayedCell(null);
    gridButton?.focus({ preventScroll: true });
  }, [focusedGridId]);

  const completedCount = grids.filter((g) => g.winner || g.isDraw).length;
  const inProgressCount = grids.filter(
    (g) => !g.winner && !g.isDraw && countMoves(g.board) > 0
  ).length;
  const hasSheetActivity = completedCount > 0 || inProgressCount > 0;
  const hasScore = score.X > 0 || score.O > 0 || score.ties > 0;
  const focusedGrid = focusedGridId !== null ? grids[focusedGridId] : null;
  const sheetRows = useMemo(() => {
    const rows: GridState[][] = [];
    for (let i = 0; i < grids.length; i += SHEET_COLUMNS) rows.push(grids.slice(i, i + SHEET_COLUMNS));
    return rows;
  }, [grids]);

  const startNewPage = useCallback(() => {
    if (focusedGridId !== null) return;
    setShowNewSheetConfirm(false);
    setPageFlipping(true);
    playPageFlip(soundEnabled);
    if (flipTimeoutRef.current !== null) window.clearTimeout(flipTimeoutRef.current);
    flipTimeoutRef.current = window.setTimeout(() => {
      flipTimeoutRef.current = null;
      clearSheet();
      setPageFlipping(false);
    }, 180);
  }, [focusedGridId, soundEnabled]);

  const handleToggleSound = useCallback(() => {
    const nextEnabled = !soundEnabled;
    setSoundEnabled(nextEnabled);
    if (nextEnabled) playZoomOut(true);
  }, [soundEnabled]);

  const handleRequestNewPage = useCallback(() => {
    if (focusedGridId !== null || pageFlipping) return;
    if (!hasSheetActivity) {
      startNewPage();
      return;
    }
    setShowNewSheetConfirm(true);
  }, [focusedGridId, pageFlipping, hasSheetActivity, startNewPage]);

  const handleCancelNewSheet = useCallback(() => setShowNewSheetConfirm(false), []);

  return (
    <main className="flex min-h-dvh w-full flex-col items-center justify-center px-2 py-4 sm:px-6 sm:py-8">
      {/* Stacked pages illusion underneath the active notebook sheet */}
      <div className="relative w-full max-w-[780px]">
        <div
          className="pointer-events-none absolute inset-0 translate-x-[5px] translate-y-[6px] rounded-[6px] border border-[#b9b09f] bg-[#e9e3d5] shadow-md"
          aria-hidden="true"
        />
        <div
          className="pointer-events-none absolute inset-0 translate-x-[2px] translate-y-[3px] rounded-[6px] border border-[#c3baa8] bg-[#efeadd]"
          aria-hidden="true"
        />

        {/* Main dotted notebook paper page */}
        <section
          aria-label="Tic-tac-toe notebook page"
          className={`paper-sheet relative rounded-[6px] border border-[#c8bfae] pt-5 pr-10 pb-6 pl-4 shadow-[0_14px_34px_rgba(38,31,22,0.18)] sm:pt-7 sm:pr-14 sm:pb-8 sm:pl-8 ${
            pageFlipping ? 'opacity-60 transition-opacity duration-150' : ''
          }`}
        >
          {/* Vector dot-grid pattern layer */}
          <svg
            className="pointer-events-none absolute inset-0 h-full w-full rounded-[5px]"
            aria-hidden="true"
          >
            <defs>
              <pattern id="notebook-dots" width="18" height="18" patternUnits="userSpaceOnUse">
                <circle cx="9" cy="9" r="1.05" fill="#bfb7a6" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#notebook-dots)" />
          </svg>

          {/* Right-edge metallic spiral binding */}
          <SpiralBinding />

          {/* Notebook header: title, how to play, and sheet controls */}
          <header className="relative z-10 mb-3 sm:mb-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h1 className="font-[family-name:var(--font-hand-display)] text-3xl leading-none font-bold tracking-wide text-[#24201b] sm:text-4xl">
                  Tic-Tac-Toe
                </h1>
                <p className="mt-1.5 text-sm text-[#574f43] sm:text-base">
                  Tap any grid to zoom in &amp; play. Tap outside it anytime to return.
                </p>
              </div>

              <div className="flex items-center gap-2">
                {hasScore && (
                  <button
                    type="button"
                    onClick={resetScore}
                    className="cursor-pointer rounded-full px-2.5 py-1 text-sm text-[#6e6558] underline decoration-dashed underline-offset-4 transition hover:text-[#24201b]"
                  >
                    Reset score
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleToggleSound}
                  aria-pressed={soundEnabled}
                  aria-label="Sound effects"
                  title={soundEnabled ? 'Sound on' : 'Sound muted'}
                  className="inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-[#8e8474] bg-[#f8f5ec] px-2.5 py-1 text-sm text-[#4a4338] shadow-xs transition hover:-translate-y-0.5 hover:border-[#5c5346] hover:text-[#24201b] active:translate-y-0 sm:px-3"
                >
                  <SoundIcon muted={!soundEnabled} />
                  <span className="hidden sm:inline">{soundEnabled ? 'Sound' : 'Muted'}</span>
                </button>
                <button
                  type="button"
                  onClick={handleRequestNewPage}
                  aria-disabled={pageFlipping || undefined}
                  className="cursor-pointer rounded-full border border-[#8e8474] bg-[#f8f5ec] px-3.5 py-1 text-sm font-medium text-[#24201b] shadow-xs transition hover:-translate-y-0.5 hover:border-[#24201b] hover:shadow-sm active:translate-y-0 aria-disabled:cursor-default aria-disabled:opacity-60 sm:text-base"
                >
                  New Sheet
                </button>
              </div>
            </div>
          </header>

          <ScoreBoard
            score={score}
            nextStarter={nextStarter}
            completedCount={completedCount}
            inProgressCount={inProgressCount}
          />

          {/* 5 columns × 7 rows of hand-drawn tic-tac-toe grids: one Tab stop, arrow keys between grids */}
          <div
            role="grid"
            aria-label={`Notebook sheet, ${GRID_COUNT} grids`}
            className="relative z-10 flex flex-col gap-2.5 sm:gap-4 md:gap-5"
            {...sheetNav.gridProps}
          >
            {sheetRows.map((row, rowIdx) => (
              <div key={rowIdx} role="row" className="grid grid-cols-5 gap-2.5 sm:gap-4 md:gap-5">
                {row.map((grid) => {
                  const status = getGridStatus(grid);
                  const isFocused = focusedGridId === grid.id;

                  return (
                    <div key={grid.id} role="gridcell">
                      <button
                        type="button"
                        tabIndex={sheetNav.tabIndexFor(grid.id)}
                        {...{ [ROVING_ATTR]: grid.id }}
                        onClick={() => handleSelectGrid(grid.id)}
                        aria-label={describeGrid(grid)}
                        className={`group relative block w-full scroll-mt-32 rounded-lg p-1 transition-[transform,background-color] duration-150 focus:outline-hidden focus-visible:ring-2 focus-visible:ring-[#1c2b4a]/50 sm:p-1.5 ${
                          isFocused
                            ? 'pointer-events-none'
                            : 'cursor-pointer hover:scale-[1.07] hover:bg-[#24201b]/[0.04] active:scale-[0.98]'
                        } ${
                          status === 'playing'
                            ? 'ring-1 ring-dashed ring-[#8a7f6d]/60 bg-[#24201b]/[0.02]'
                            : ''
                        } ${
                          grid.winner === 'X'
                            ? 'bg-[#1c2b4a]/[0.035]'
                            : grid.winner === 'O'
                              ? 'bg-[#b3342b]/[0.035]'
                              : status === 'draw'
                                ? 'bg-[#24201b]/[0.025]'
                                : ''
                        }`}
                      >
                        <div
                          ref={(el) => {
                            cellRefs.current[grid.id] = el;
                          }}
                          className={isFocused ? 'opacity-0' : undefined}
                        >
                          <TicTacToeBoard grid={grid} sizeVariant="mini" />
                        </div>

                        {/* Subtle corner mark for in-progress or drawn grids */}
                        {status === 'playing' && (
                          <span
                            className="absolute right-1 bottom-0.5 h-1.5 w-1.5 rounded-full bg-[#7a6f5d]/70"
                            aria-hidden="true"
                          />
                        )}
                        {status === 'draw' && (
                          <span
                            className="pointer-events-none absolute right-1 bottom-0 text-[10px] leading-none text-[#756c5f] sm:text-xs"
                            aria-hidden="true"
                          >
                            –
                          </span>
                        )}
                      </button>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* Centered enlarged playable/inspectable overlay */}
      {focusedGrid && sourceRect && (
        <FocusedGridOverlay
          grid={focusedGrid}
          sourceRect={sourceRect}
          getSourceRect={getSourceRect}
          lastPlayedCell={lastPlayedCell}
          wasFinishedOnOpen={wasFinishedOnOpen}
          isClosing={isClosing}
          nextEmptyGridId={nextEmptyGridId}
          onCellClick={handleCellClick}
          onNextEmptyGrid={handleNextEmptyGrid}
          onRequestClose={handleRequestClose}
          onCloseComplete={handleCloseComplete}
        />
      )}

      {showNewSheetConfirm && (
        <NewSheetDialog
          completedCount={completedCount}
          inProgressCount={inProgressCount}
          onCancel={handleCancelNewSheet}
          onConfirm={startNewPage}
        />
      )}
    </main>
  );
}
